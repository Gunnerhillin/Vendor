import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail, orderConfirmationEmail, vendorNewOrderEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { orderId, customerEmail, customerName } = await request.json()

    if (!orderId || !customerEmail) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Get full order details
    const { data: order } = await supabase
      .from('orders')
      .select('*, items:order_items(*, product:products(title, vendor_id), vendor:vendors(business_name, user_id, commission_rate))')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Send customer confirmation
    const items = order.items?.map((item: any) => ({
      title: item.product?.title || 'Product',
      quantity: item.quantity,
      price: item.unit_price,
    })) || []

    await sendEmail({
      to: customerEmail,
      subject: `Order Confirmed — #${orderId.slice(0, 8)}`,
      html: orderConfirmationEmail({
        customerName: customerName || 'there',
        orderId,
        items,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
      }),
    })

    // Send vendor notifications (grouped by vendor)
    const vendorItems: Record<string, { vendorName: string; vendorEmail: string; items: any[]; revenue: number }> = {}

    for (const item of order.items || []) {
      const vendorId = item.vendor_id
      if (!vendorItems[vendorId]) {
        // Get vendor's email
        const { data: vendorProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', item.vendor?.user_id)
          .single()

        vendorItems[vendorId] = {
          vendorName: item.vendor?.business_name || 'Vendor',
          vendorEmail: vendorProfile?.email || '',
          items: [],
          revenue: 0,
        }
      }

      const commissionRate = item.vendor?.commission_rate || 0.25
      const vendorShare = item.unit_price * item.quantity * (1 - commissionRate)

      vendorItems[vendorId].items.push({
        title: item.product?.title || 'Product',
        quantity: item.quantity,
        price: item.unit_price,
      })
      vendorItems[vendorId].revenue += vendorShare
    }

    // Send email to each vendor
    for (const vendor of Object.values(vendorItems)) {
      if (vendor.vendorEmail) {
        await sendEmail({
          to: vendor.vendorEmail,
          subject: `New Order — #${orderId.slice(0, 8)}`,
          html: vendorNewOrderEmail({
            vendorName: vendor.vendorName,
            orderId,
            items: vendor.items,
            totalRevenue: vendor.revenue,
          }),
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Order confirmation email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
