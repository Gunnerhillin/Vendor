import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
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

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Calculate totals and prepare order items, grouped by vendor
    let subtotal = 0
    const orderItems: any[] = []
    const vendorTotals: Record<string, { amount: number; stripeAccountId: string | null; commissionRate: number }> = {}
    const productQuantities = new Map<string, number>()
    const variantQuantities = new Map<string, number>()

    for (const item of items) {
      if (!item?.product?.id || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
        return NextResponse.json({ error: 'Invalid cart item or quantity' }, { status: 400 })
      }
      // Fetch product with vendor info (including stripe account)
      const { data: product } = await supabase
        .from('products')
        .select('id, price, vendor_id, title, inventory_count, vendor:vendors!inner(status)')
        .eq('id', item.product.id)
        .eq('status', 'approved')
        .eq('vendor.status', 'approved')
        .single()

      if (!product) return NextResponse.json({ error: 'A product is no longer available' }, { status: 400 })

      // Check inventory
      const requested = (productQuantities.get(product.id) || 0) + item.quantity
      productQuantities.set(product.id, requested)
      if (product.inventory_count < requested) {
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

      if (!vendor) return NextResponse.json({ error: 'Vendor unavailable' }, { status: 400 })
      let adjustment = 0
      if (item.variant?.id) {
        const { data: variant } = await supabase.from('product_variants')
          .select('id, price_adjustment, inventory_count').eq('id', item.variant.id).eq('product_id', product.id).single()
        const variantQuantity = (variantQuantities.get(item.variant.id) || 0) + item.quantity
        variantQuantities.set(item.variant.id, variantQuantity)
        if (!variant || variant.inventory_count < variantQuantity) return NextResponse.json({ error: 'Variant unavailable' }, { status: 400 })
        adjustment = Number(variant.price_adjustment)
      }
      const cents = Math.round((Number(product.price) + adjustment) * 100)
      if (!Number.isSafeInteger(cents) || cents <= 0) return NextResponse.json({ error: 'Invalid product price' }, { status: 400 })
      const price = cents / 100
      const itemTotal = cents * item.quantity / 100
      subtotal += itemTotal

      orderItems.push({
        product_id: product.id,
        variant_id: item.variant?.id || null,
        vendor_id: product.vendor_id,
        quantity: item.quantity,
        unit_price: price,
        status: 'pending',
        commission_rate: vendor.commission_rate ?? DEFAULT_COMMISSION_RATE,
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
    const service = await createServiceRoleClient()
    const { data: order, error: orderError } = await service
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

    const { error: itemsError } = await service.from('order_items').insert(itemsWithOrderId)

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
