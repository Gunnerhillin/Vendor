import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/returns - List return requests
 * For customers: their own returns
 * For vendors: returns on their products
 * For admins: all returns
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role') // 'vendor' or 'admin'

    let query = supabase
      .from('return_requests')
      .select('*, customer:profiles!customer_id(full_name, email), vendor:vendors!vendor_id(business_name), order_item:order_items!order_item_id(*, product:products(title, slug, images:product_images(url)))')
      .order('created_at', { ascending: false })

    if (role === 'admin') {
      // Admin sees all (RLS handles permission)
    } else if (role === 'vendor') {
      const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single()
      if (vendor) query = query.eq('vendor_id', vendor.id)
    } else {
      query = query.eq('customer_id', user.id)
    }

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ returns: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/returns - Create a return request (customer)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { order_item_id, reason, description } = await request.json()

    if (!order_item_id || !reason) {
      return NextResponse.json({ error: 'order_item_id and reason are required' }, { status: 400 })
    }

    // Get order item and verify ownership
    const { data: orderItem } = await supabase
      .from('order_items')
      .select('id, order_id, vendor_id, status, return_status')
      .eq('id', order_item_id)
      .single()

    if (!orderItem) return NextResponse.json({ error: 'Order item not found' }, { status: 404 })

    // Verify customer owns this order
    const { data: order } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('id', orderItem.order_id)
      .single()

    if (!order || order.customer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if already has a return request
    if (orderItem.return_status) {
      return NextResponse.json({ error: 'A return has already been requested for this item' }, { status: 400 })
    }

    // Must be delivered to request return
    if (orderItem.status !== 'delivered' && orderItem.status !== 'shipped') {
      return NextResponse.json({ error: 'Item must be delivered before requesting a return' }, { status: 400 })
    }

    // Create return request
    const { data: returnReq, error: insertError } = await supabase
      .from('return_requests')
      .insert({
        order_item_id,
        order_id: orderItem.order_id,
        customer_id: user.id,
        vendor_id: orderItem.vendor_id,
        reason,
        description: description || null,
      })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // Update order item return status
    await supabase
      .from('order_items')
      .update({
        return_status: 'requested',
        return_reason: reason,
        return_requested_at: new Date().toISOString(),
      })
      .eq('id', order_item_id)

    return NextResponse.json({ return: returnReq })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/returns - Update return request (vendor/admin)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { return_id, status, resolution_notes, admin_override } = await request.json()

    if (!return_id || !status) {
      return NextResponse.json({ error: 'return_id and status are required' }, { status: 400 })
    }

    // Get the return request
    const { data: returnReq } = await supabase
      .from('return_requests')
      .select('*')
      .eq('id', return_id)
      .single()

    if (!returnReq) return NextResponse.json({ error: 'Return request not found' }, { status: 404 })

    // Check permissions: vendor or admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    if (!isAdmin) {
      const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single()
      if (!vendor || vendor.id !== returnReq.vendor_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Update return request
    const { error: updateError } = await supabase
      .from('return_requests')
      .update({
        status,
        resolved_by: user.id,
        resolution_notes: resolution_notes || null,
        admin_override: isAdmin && admin_override ? true : false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', return_id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // Update order item return status
    await supabase
      .from('order_items')
      .update({
        return_status: status,
        return_resolved_at: new Date().toISOString(),
        return_resolved_by: user.id,
        return_notes: resolution_notes || null,
      })
      .eq('id', returnReq.order_item_id)

    // If return is approved/completed and admin, could trigger refund
    if (status === 'completed') {
      await supabase
        .from('order_items')
        .update({ status: 'refunded' })
        .eq('id', returnReq.order_item_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
