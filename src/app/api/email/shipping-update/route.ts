import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail, shippingUpdateEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { orderId, orderItemId, status, trackingNumber, carrier } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Get order and customer info
    const { data: order } = await supabase
      .from('orders')
      .select('id, customer_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: customer } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', order.customer_id)
      .single()

    if (customer?.email) {
      await sendEmail({
        to: customer.email,
        subject: status === 'shipped'
          ? `Your order has shipped! — #${orderId.slice(0, 8)}`
          : `Order Update — #${orderId.slice(0, 8)}`,
        html: shippingUpdateEmail({
          customerName: customer.full_name || 'there',
          orderId,
          trackingNumber,
          carrier,
          status,
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Shipping update email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
