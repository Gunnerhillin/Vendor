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
      .select('*, customer:public_profiles!customer_id(full_name), vendor:vendor_directory!vendor_id(business_name), order_item:order_items!order_item_id(*, product:products(title, slug, images:product_images(url)))')
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
    const db = await createServerSupabaseClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({error:'Sign in required'}, {status:401})
    const body = await request.json()
    const {data,error} = await db.rpc('request_return', {item_arg:body.order_item_id,reason_arg:body.reason,description_arg:body.description || null})
    if(error) return NextResponse.json({error:error.code==='P0001'?error.message:'Unable to request this return'}, {status:409})
    return NextResponse.json({return:data})
  } catch { return NextResponse.json({error:'Invalid return request'}, {status:400}) }
}
export async function PATCH(request: NextRequest) {
  try {
    const db = await createServerSupabaseClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({error:'Sign in required'}, {status:401})
    const body = await request.json()
    if(body.status==='completed') return NextResponse.json({error:'A verified Stripe refund is required before completing this return.'},{status:409})
    const {data,error} = body.status==='received'
      ? await db.rpc('receive_return', {return_arg:body.return_id,notes_arg:body.resolution_notes})
      : await db.rpc('decide_return', {return_arg:body.return_id,status_arg:body.status,notes_arg:body.resolution_notes || null})
    if(error) return NextResponse.json({error:error.code==='P0001'?error.message:'Unable to change this return'}, {status:409})
    return NextResponse.json({success:true,return:data})
  } catch { return NextResponse.json({error:'Invalid return decision'}, {status:400}) }
}
