import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Shipping Webhook API
 *
 * Receives tracking updates from external shipping platforms like ShippingEasy,
 * ShipStation, Pirate Ship, etc. When a vendor prints a label in their shipping
 * platform, a webhook fires here to auto-populate the tracking number.
 *
 * Authentication: Bearer token (vendor's shipping_webhook_token)
 *
 * POST body:
 * {
 *   "order_item_id": "uuid",        // Vender order item ID
 *   "tracking_number": "1Z999...",   // Tracking number from carrier
 *   "carrier": "ups",               // usps, ups, fedex, dhl, other
 *   "service"?: "Ground",           // Optional service level
 *   "status"?: "shipped"            // Optional: "shipped" or "delivered"
 * }
 *
 * Bulk update (alternative):
 * {
 *   "shipments": [
 *     { "order_item_id": "uuid", "tracking_number": "...", "carrier": "..." },
 *     ...
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Extract bearer token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header. Use: Bearer <token>' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const supabase = await createServiceRoleClient()

    // Look up vendor by webhook token
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, business_name')
      .eq('shipping_webhook_token', token)
      .single()

    if (!vendor) {
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 })
    }

    const body = await request.json()

    // Handle bulk or single shipment
    const shipments = body.shipments || [body]
    const results: { order_item_id: string; success: boolean; error?: string }[] = []

    for (const shipment of shipments) {
      const { order_item_id, tracking_number, carrier, status } = shipment

      if (!order_item_id || !tracking_number) {
        results.push({ order_item_id: order_item_id || 'unknown', success: false, error: 'order_item_id and tracking_number are required' })
        continue
      }

      // Verify this order item belongs to this vendor
      const { data: orderItem } = await supabase
        .from('order_items')
        .select('id, order_id, status')
        .eq('id', order_item_id)
        .eq('vendor_id', vendor.id)
        .single()

      if (!orderItem) {
        results.push({ order_item_id, success: false, error: 'Order item not found or does not belong to this vendor' })
        continue
      }

      // Update the order item with tracking info
      const updateData: any = {
        tracking_number,
        shipping_carrier: (carrier || 'other').toLowerCase(),
        status: status === 'delivered' ? 'delivered' : 'shipped',
        shipped_at: new Date().toISOString(),
      }

      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('order_items')
        .update(updateData)
        .eq('id', order_item_id)

      if (updateError) {
        results.push({ order_item_id, success: false, error: updateError.message })
        continue
      }

      // Check if all items in the order are shipped/delivered, then update the parent order
      const { data: allItems } = await supabase
        .from('order_items')
        .select('status')
        .eq('order_id', orderItem.order_id)

      if (allItems) {
        const allShipped = allItems.every(i => i.status === 'shipped' || i.status === 'delivered')
        const allDelivered = allItems.every(i => i.status === 'delivered')

        if (allDelivered) {
          await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderItem.order_id)
        } else if (allShipped) {
          await supabase.from('orders').update({ status: 'shipped' }).eq('id', orderItem.order_id)
        }
      }

      // Send shipping notification email (fire and forget)
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vendor-uiu3.vercel.app'
        await fetch(`${appUrl}/api/email/shipping-update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderItem.order_id,
            orderItemId: order_item_id,
            status: status === 'delivered' ? 'delivered' : 'shipped',
            trackingNumber: tracking_number,
            carrier: carrier || 'other',
          }),
        })
      } catch {
        // Email is best-effort
      }

      results.push({ order_item_id, success: true })
    }

    const allSuccess = results.every(r => r.success)
    return NextResponse.json({
      success: allSuccess,
      results,
      vendor: vendor.business_name,
    }, { status: allSuccess ? 200 : 207 })
  } catch (error: any) {
    console.error('Shipping webhook error:', error)
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 })
  }
}
