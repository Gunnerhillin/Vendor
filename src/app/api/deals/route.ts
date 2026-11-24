import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/deals - List deals
 * Vendors see their own, admins see all
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    let query = supabase
      .from('deals')
      .select('*, product:products(id, title, slug, price, compare_at_price, images:product_images(url)), vendor:vendors(id, business_name)')
      .order('created_at', { ascending: false })

    if (role === 'vendor') {
      const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single()
      if (vendor) query = query.eq('vendor_id', vendor.id)
    }

    if (status && status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ deals: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/deals - Vendor creates a flash deal request
 */
export async function POST(request:NextRequest){
 try {
  const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser()
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
  const body=await request.json()
  if(!Number.isInteger(body.discount_percent))return NextResponse.json({error:'Choose a whole-number percentage'},{status:400})
  const {data,error}=await db.rpc('request_flash_deal',{product_arg:body.product_id,percent_arg:body.discount_percent,start_arg:body.starts_at,end_arg:body.ends_at})
  if(error)return NextResponse.json({error:error.code==='P0001'?error.message:'Unable to request this deal'},{status:409})
  return NextResponse.json({deal:data})
 }catch{return NextResponse.json({error:'Invalid deal request'},{status:400})}
}
export async function PATCH(request:NextRequest){
 try {
  const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser()
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
  const body=await request.json()
  const {data,error}=await db.rpc('review_flash_deal',{deal_arg:body.deal_id,status_arg:body.status,notes_arg:body.admin_notes||null})
  if(error)return NextResponse.json({error:error.code==='P0001'?error.message:'Admin review required'},{status:409})
  return NextResponse.json({success:true,deal:data})
 }catch{return NextResponse.json({error:'Invalid deal review'},{status:400})}
}
