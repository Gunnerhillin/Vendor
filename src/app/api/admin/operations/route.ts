import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { reconcileCheckout } from '@/lib/checkout'
export async function POST(request: NextRequest) {
  const session = await createServerSupabaseClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({error:'Sign in required'}, {status:401})
  const { data: actor } = await session.from('profiles').select('role').eq('id', user.id).single()
  if (actor?.role !== 'admin') return NextResponse.json({error:'Admin access required'}, {status:403})
  const db = await createServiceRoleClient()
  const {data: orders, error} = await db.from('orders').select('id,checkout_session_id').eq('reservation_state','reserved').not('checkout_session_id','is',null).order('created_at').limit(20)
  if(error) return NextResponse.json({error:'Unable to load reserved orders'}, {status:503})
  let checked=0, failed=0
  for(const order of orders || []) {
    try { const checkout = await stripe.checkout.sessions.retrieve(order.checkout_session_id); await reconcileCheckout(checkout, `recovery:${checkout.id}`); checked++ }
    catch { failed++ }
  }
  return NextResponse.json({checked,failed})
}
