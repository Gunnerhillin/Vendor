import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { recoverReservedCheckout } from '@/lib/checkout'
export async function POST(request: NextRequest) {
  const session = await createServerSupabaseClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({error:'Sign in required'}, {status:401})
  const { data: actor } = await session.from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') return NextResponse.json({error:'Admin access required'}, {status:403})
  const db = await createServiceRoleClient()
  let orderId:string|undefined
  const raw=await request.text()
  if(raw){try{const body=JSON.parse(raw);if(body.orderId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.orderId))return NextResponse.json({error:'Invalid order'},{status:400});orderId=body.orderId}catch{return NextResponse.json({error:'Invalid request'},{status:400})}}
  let query=db.from('orders').select('id,checkout_session_id,created_at').eq('reservation_state','reserved').order('created_at').limit(orderId?1:20)
  if(orderId)query=query.eq('id',orderId)
  const {data:orders,error}=await query
  if(error) return NextResponse.json({error:'Unable to load reserved orders'}, {status:503})
  let checked=0, failed=0
  for(const order of orders || []) {
    try { await recoverReservedCheckout(order); checked++ }
    catch { failed++ }
  }
  return NextResponse.json({checked,failed})
}
