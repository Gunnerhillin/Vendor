import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { DEFAULT_COMMISSION_RATE } from '@/lib/constants'
import type { CartItem, ShippingAddress } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { items, shippingAddress }: { items: CartItem[]; shippingAddress: ShippingAddress } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Calculate totals and prepare order items, grouped by vendor
    let subtotal = 0
    const orderItems: any[] = []
    const vendorTotals: Record<string, { amount: number; stripeAccountId: string | null; commissionRate: number }> = {}

    for (const item of items) {
      // Fetch product with vendor info (including stripe account)
      const { data: product } = await supabase
        .from('products')
        .select('id, price, vendor_id, title, inventory_count')
        .eq('id', item.product.id)
        .single()

      if (!product) continue

      // Check inventory
      if (product.inventory_count < item.quantity) {
        return NextResponse.json(
          { error: `"${product.title}" only has ${product.inventory_count} in stock` },
          { status: 400 }
        )
      }

      // Fetch vendor's stripe account and commission rate
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id, stripe_account_id, commission_rate')
        .eq('id', product.vendor_id)
        .single()

      const price = product.price + (item.variant?.price_adjustment || 0)
      const itemTotal = price * item.quantity
      subtotal += itemTotal

      orderItems.push({
        product_id: product.id,
        variant_id: item.variant?.id || null,
        vendor_id: product.vendor_id,
        quantity: item.quantity,
        unit_price: price,
        status: 'pending',
      })

      // Accumulate vendor totals for transfers
      if (vendor) {
        if (!vendorTotals[vendor.id]) {
          vendorTotals[vendor.id] = {
            amount: 0,
            stripeAccountId: vendor.stripe_account_id,
            commissionRate: vendor.commission_rate || DEFAULT_COMMISSION_RATE,
          }
        }
        vendorTotals[vendor.id].amount += itemTotal
      }
    }

    // Calculate taxes — shipping is handled by individual vendors, not the platform
    const tax = Math.round(subtotal * 0.08 * 100) / 100
    const shipping = 0
    const total = Math.round((subtotal + tax) * 100) / 100

    // Build transfer metadata for each vendor (used after payment succeeds)
    const transferGroup = `order_${Date.now()}`
    const vendorTransfers = Object.entries(vendorTotals).map(([vendorId, info]) => {
      const vendorRevenue = info.amount * (1 - info.commissionRate)
      return {
        vendor_id: vendorId,
        stripe_account_id: info.stripeAccountId,
        gross_amount: info.amount,
        commission: info.amount * info.commissionRate,
        vendor_payout: Math.round(vendorRevenue * 100) / 100,
      }
    })

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // cents
      currency: 'usd',
      metadata: {
        customer_id: user.id,
        transfer_group: transferGroup,
        vendor_transfers: JSON.stringify(vendorTransfers),
      },
      transfer_group: transferGroup,
      automatic_payment_methods: { enabled: true },
    })

    // Create order in DB
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        status: 'pending',
        subtotal,
        tax,
        shipping,
        total,
        stripe_payment_id: paymentIntent.id,
        shipping_name: shippingAddress?.name || '',
        shipping_line1: shippingAddress?.line1 || '',
        shipping_line2: shippingAddress?.line2 || '',
        shipping_city: shippingAddress?.city || '',
        shipping_state: shippingAddress?.state || '',
        shipping_postal_code: shippingAddress?.postal_code || '',
        shipping_country: shippingAddress?.country || 'US',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Create order items
    const itemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId)

    if (itemsError) {
      console.error('Order items error:', itemsError)
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
    })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 })
  }
}
