import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    if (webhookSecret && webhookSecret !== 'whsec_placeholder' && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      // Dev mode - parse body directly
      event = JSON.parse(body)
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { data: order } = await supabase
          .from('orders')
          .select('id, customer_id')
          .eq('stripe_payment_id', paymentIntent.id)
          .single()

        if (order) {
          // 1. Update order status
          await supabase.from('orders').update({ status: 'processing' }).eq('id', order.id)
          await supabase.from('order_items').update({ status: 'processing' }).eq('order_id', order.id)

          // 2. Decrement inventory and update vendor stats
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, variant_id, quantity, vendor_id, unit_price')
            .eq('order_id', order.id)

          if (orderItems) {
            for (const item of orderItems) {
              // Decrement product inventory and increment sold_count
              const { data: prod } = await supabase
                .from('products')
                .select('inventory_count, sold_count')
                .eq('id', item.product_id)
                .single()

              if (prod) {
                await supabase.from('products').update({
                  inventory_count: Math.max(0, prod.inventory_count - item.quantity),
                  sold_count: prod.sold_count + item.quantity,
                }).eq('id', item.product_id)
              }

              // If variant, decrement variant inventory too
              if (item.variant_id) {
                const { data: variant } = await supabase
                  .from('product_variants')
                  .select('inventory_count')
                  .eq('id', item.variant_id)
                  .single()

                if (variant) {
                  await supabase.from('product_variants').update({
                    inventory_count: Math.max(0, variant.inventory_count - item.quantity),
                  }).eq('id', item.variant_id)
                }
              }
            }

            // 3. Aggregate vendor sales from this order
            const vendorSales: Record<string, { revenue: number; sales: number }> = {}
            for (const item of orderItems) {
              if (!vendorSales[item.vendor_id]) {
                vendorSales[item.vendor_id] = { revenue: 0, sales: 0 }
              }
              vendorSales[item.vendor_id].revenue += item.unit_price * item.quantity
              vendorSales[item.vendor_id].sales += item.quantity
            }

            // 4. Update vendor totals and create payout records
            for (const [vendorId, stats] of Object.entries(vendorSales)) {
              const { data: vendor } = await supabase
                .from('vendors')
                .select('total_revenue, total_sales, commission_rate')
                .eq('id', vendorId)
                .single()

              if (vendor) {
                const commissionRate = vendor.commission_rate || 0.25
                const vendorShare = stats.revenue * (1 - commissionRate)

                await supabase.from('vendors').update({
                  total_revenue: (vendor.total_revenue || 0) + vendorShare,
                  total_sales: (vendor.total_sales || 0) + stats.sales,
                }).eq('id', vendorId)

                // Create payout record
                await supabase.from('payouts').insert({
                  vendor_id: vendorId,
                  amount: Math.round(vendorShare * 100) / 100,
                  status: 'pending',
                  period_start: new Date().toISOString(),
                  period_end: new Date().toISOString(),
                })
              }
            }

            // 5. Create Stripe Transfers to vendors with connected accounts
            const transfersJson = paymentIntent.metadata?.vendor_transfers
            if (transfersJson) {
              try {
                const transfers = JSON.parse(transfersJson)
                for (const t of transfers) {
                  if (t.stripe_account_id) {
                    try {
                      await stripe.transfers.create({
                        amount: Math.round(t.vendor_payout * 100), // cents
                        currency: 'usd',
                        destination: t.stripe_account_id,
                        transfer_group: paymentIntent.metadata?.transfer_group || undefined,
                        metadata: {
                          order_id: order.id,
                          vendor_id: t.vendor_id,
                          commission: String(t.commission),
                        },
                      })

                      // Mark payout as processing since transfer was created
                      await supabase.from('payouts')
                        .update({ status: 'processing' })
                        .eq('vendor_id', t.vendor_id)
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false })
                        .limit(1)
                    } catch (transferErr: any) {
                      console.error(`Transfer to vendor ${t.vendor_id} failed:`, transferErr.message)
                    }
                  }
                }
              } catch (parseErr) {
                console.error('Failed to parse vendor_transfers:', parseErr)
              }
            }
          }

          // 6. Send order confirmation email (fire-and-forget)
          try {
            const { data: customer } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', order.customer_id)
              .single()

            if (customer?.email) {
              fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/order-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: order.id,
                  customerEmail: customer.email,
                  customerName: customer.full_name,
                }),
              }).catch(err => console.error('Email send failed:', err))
            }
          } catch (emailErr) {
            console.error('Email notification error:', emailErr)
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_id', paymentIntent.id)
          .single()

        if (order) {
          await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
          await supabase.from('order_items').update({ status: 'cancelled' }).eq('order_id', order.id)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        if (charge.payment_intent) {
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_payment_id', charge.payment_intent)
            .single()

          if (order) {
            await supabase.from('orders').update({ status: 'refunded' }).eq('id', order.id)
            await supabase.from('order_items').update({ status: 'refunded' }).eq('order_id', order.id)

            // Restore inventory on refund
            const { data: orderItems } = await supabase
              .from('order_items')
              .select('product_id, quantity')
              .eq('order_id', order.id)

            if (orderItems) {
              for (const item of orderItems) {
                const { data: prod } = await supabase
                  .from('products')
                  .select('inventory_count, sold_count')
                  .eq('id', item.product_id)
                  .single()

                if (prod) {
                  await supabase.from('products').update({
                    inventory_count: prod.inventory_count + item.quantity,
                    sold_count: Math.max(0, prod.sold_count - item.quantity),
                  }).eq('id', item.product_id)
                }
              }
            }
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
