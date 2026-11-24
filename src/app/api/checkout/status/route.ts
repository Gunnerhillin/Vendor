import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { reconcileCheckout } from '@/lib/checkout'

const validId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const matchesOrder = (session: { metadata: Record<string, string> | null; client_reference_id: string | null }, id: string) => session.metadata?.order_id === id && session.client_reference_id === id

export async function GET(request: NextRequest) {
  const db = await createServerSupabaseClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const id = request.nextUrl.searchParams.get('order')
  if (!validId(id)) return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  const { data: order } = await db.from('orders').select('id,status,payment_processed_at,checkout_session_id,reservation_state,total,checkout_cart').eq('id', id).eq('customer_id', user.id).single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (!order.payment_processed_at && order.checkout_session_id && order.reservation_state === 'reserved') {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.checkout_session_id)
      if (!matchesOrder(session, order.id)) throw new Error('Checkout reference mismatch')
      await reconcileCheckout(session, `recovery:${session.id}`)
    } catch { return NextResponse.json({ error: 'Payment confirmation is still being checked. Please retry shortly.' }, { status: 503 }) }
    const { data: current } = await db.from('orders').select('status,payment_processed_at,reservation_state,total').eq('id',id).single()
    Object.assign(order, current)
  }
  return NextResponse.json({ order: { id: order.id,status:order.status,paid:!!order.payment_processed_at,total:order.total,cart:order.checkout_cart } }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const db = await createServerSupabaseClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  let orderId: unknown
  try { ({ orderId } = await request.json()) } catch { return NextResponse.json({ error: 'Invalid cancellation request' }, { status: 400 }) }
  if (!validId(orderId)) return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  const { data: order } = await db.from('orders').select('id,checkout_session_id,payment_processed_at').eq('id',orderId).eq('customer_id',user.id).single()
  if (!order?.checkout_session_id) return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
  try {
    let session = await stripe.checkout.sessions.retrieve(order.checkout_session_id)
    if (!matchesOrder(session, order.id)) throw new Error('Checkout reference mismatch')
    if (session.status === 'open') session = await stripe.checkout.sessions.expire(session.id)
    await reconcileCheckout(session,`recovery:${session.id}`)
    return NextResponse.json({ cancelled: session.status === 'expired' })
  } catch { return NextResponse.json({ error: 'Unable to cancel safely. Check the order status and retry.' },{status:409}) }
}
