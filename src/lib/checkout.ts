import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function reconcileCheckout(session: Stripe.Checkout.Session, eventId: string) {
  const orderId = session.metadata?.order_id
  if (!orderId) return // Ignore unrelated Stripe sessions.
  await linkSession(session)
  const db = await createServiceRoleClient()
  if (session.status === 'expired') {
    const { error } = await db.rpc('release_checkout', { order_arg: orderId, session_arg: session.id })
    if (error) throw new Error('Unable to release checkout reservation')
    return
  }
  if (session.status !== 'complete' || session.payment_status !== 'paid') return
  const paymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!paymentId) throw new Error('Payment missing')
  const payment = await stripe.paymentIntents.retrieve(paymentId)
  if (payment.status !== 'succeeded' || payment.amount_received !== session.amount_total) throw new Error('Payment not settled')
  const address = session.shipping_details?.address
  const { error } = await db.rpc('complete_checkout', {
    event_arg: eventId, order_arg: orderId, session_arg: session.id, payment_arg: payment.id,
    charge_arg: typeof payment.latest_charge === 'string' ? payment.latest_charge : payment.latest_charge?.id,
    subtotal_arg: session.amount_subtotal, total_arg: session.amount_total,
    tax_arg: session.total_details?.amount_tax ?? 0, currency_arg: session.currency,
    address_arg: { ...address, name: session.shipping_details?.name },
  })
  if (error) throw new Error('Unable to finalize paid order')
}

export async function startCheckout(order: any, items: any[]) {
  const origin = process.env.NEXT_PUBLIC_APP_URL
  if (!origin || !/^https?:\/\//.test(origin)) throw new Error('Store address is not configured')
  if (order.reservation_state !== 'reserved') throw new Error('This checkout is no longer active')
  if (order.checkout_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(order.checkout_session_id)
    await reconcileCheckout(existing, `recovery:${existing.id}`)
    if (existing.status !== 'open' || !existing.url) throw new Error('This checkout has ended. Check your order history.')
    return existing.url
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', payment_method_types: ['card'], customer_email: order.checkout_email,
    client_reference_id: order.id, metadata: { order_id: order.id },
    payment_intent_data: { metadata: { checkout_order_id: order.id }, transfer_group: order.id },
    shipping_address_collection: { allowed_countries: ['US'] },
    automatic_tax: { enabled: true },
    expires_at: Math.floor(new Date(order.reservation_expires_at).getTime() / 1000),
    success_url: `${origin}/checkout/result?order=${order.id}`,
    cancel_url: `${origin}/checkout/result?order=${order.id}&cancelled=1`,
    line_items: items.map(item => ({ quantity: item.quantity, price_data: {
      currency: 'usd', unit_amount: Math.round(Number(item.unit_price) * 100), tax_behavior: 'exclusive',
      product_data: { name: `${item.product_title}${item.variant_description ? ` — ${item.variant_description}` : ''}`.slice(0,250) },
    } })),
  }, { idempotencyKey: `checkout:${order.id}` })
  await linkSession(session)
  if (!session.url) throw new Error('Checkout could not be opened. Check order status before retrying.')
  return session.url
}

async function linkSession(session: Stripe.Checkout.Session) {
  const orderId=session.metadata?.order_id
  if(!orderId || session.client_reference_id!==orderId) throw new Error('Checkout reference mismatch')
  const db=await createServiceRoleClient()
  const {error}=await db.rpc('link_checkout_session',{order_arg:orderId,session_arg:session.id,subtotal_arg:session.amount_subtotal,currency_arg:session.currency,live_arg:session.livemode,url_arg:session.url})
  if(error) throw new Error('Unable to link verified checkout session')
}

export async function recoverReservedCheckout(order: any) {
  if(order.checkout_session_id) {
    const session=await stripe.checkout.sessions.retrieve(order.checkout_session_id)
    await reconcileCheckout(session,`recovery:${session.id}`)
    return
  }
  // Search a bounded creation window. Absence is never treated as proof of nonpayment.
  const start=Math.floor(new Date(order.created_at).getTime()/1000)-60
  let found:Stripe.Checkout.Session|undefined,scanned=0
  await stripe.checkout.sessions.list({created:{gte:start,lte:start+3660},limit:100}).autoPagingEach(session=>{
    scanned++
    if(session.metadata?.order_id===order.id){found=session;return false}
    if(scanned>=1000)return false
  })
  if(!found) throw new Error('No linked session found; keep reservation for manual reconciliation')
  await reconcileCheckout(found,`recovery:${found.id}`)
}
