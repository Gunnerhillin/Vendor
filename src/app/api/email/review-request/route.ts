import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail, reviewRequestEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Get order with customer and items
    const { data: order } = await supabase
      .from('orders')
      .select('id, customer_id, status')
      .eq('id', orderId)
      .single()

    if (!order || order.status === 'cancelled' || order.status === 'refunded') {
      return NextResponse.json({ error: 'Order not eligible' }, { status: 400 })
    }

    // Get customer info
    const { data: customer } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', order.customer_id)
      .single()

    if (!customer?.email) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get order items with product info
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, products(title, slug)')
      .eq('order_id', orderId)

    const items = (orderItems || [])
      .filter((item: any) => item.products)
      .map((item: any) => ({
        title: item.products.title,
        slug: item.products.slug,
      }))

    if (items.length === 0) {
      return NextResponse.json({ error: 'No items found' }, { status: 400 })
    }

    const html = reviewRequestEmail({
      customerName: customer.full_name || '',
      orderId: order.id,
      items,
    })

    await sendEmail({
      to: customer.email,
      subject: 'How was your order? Leave a review!',
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Review request email error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
