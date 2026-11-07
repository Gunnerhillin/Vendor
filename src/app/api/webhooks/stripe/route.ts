import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  if (!webhookSecret || webhookSecret.includes('placeholder')) {
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 })
  }
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const supabase = await createServiceRoleClient()
    const processPayment = async (type: string, paymentId: string, amount: number | null = null, refunded: number | null = null, currency = 'usd') => {
      const { error } = await supabase.rpc('process_payment_event', {
        event_id_arg: event.id, event_type_arg: type, payment_id_arg: paymentId,
        amount_cents_arg: amount, refunded_cents_arg: refunded, currency_arg: currency,
      })
      if (error) throw new Error('Payment accounting transaction failed')
    }
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const payment = event.data.object as Stripe.PaymentIntent
        await processPayment(event.type, payment.id, payment.amount_received, null, payment.currency)
        break
      }
      case 'payment_intent.payment_failed': {
        const payment = event.data.object as Stripe.PaymentIntent
        await processPayment(event.type, payment.id)
        break
      }
      case 'charge.refunded':
      case 'refund.updated':
      case 'refund.failed': {
        const object = event.data.object as Stripe.Charge | Stripe.Refund
        const chargeId = object.object === 'charge' ? object.id : typeof object.charge === 'string' ? object.charge : object.charge?.id
        if (!chargeId) throw new Error('Refund charge is missing')
        const charge = await stripe.charges.retrieve(chargeId)
        const paymentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (!paymentId) break
        let succeeded = 0
        await stripe.refunds.list({ charge: charge.id, limit: 100 }).autoPagingEach(refund => {
          if (refund.status === 'succeeded') succeeded += refund.amount
        })
        await processPayment('charge.refunded', paymentId, charge.amount, succeeded, charge.currency)
        break
      }
      case 'account.updated': {
        // Retrieve the current account so delayed events cannot restore stale eligibility.
        const account = await stripe.accounts.retrieve((event.data.object as Stripe.Account).id)
        const ready = !!account.details_submitted && !!account.charges_enabled && !!account.payouts_enabled
        const { error } = await supabase.from('vendors').update({ stripe_onboarding_complete: ready }).eq('stripe_account_id', account.id)
        if (error) throw new Error('Unable to update vendor payment eligibility')
        break
      }
    }
    return NextResponse.json({ received: true })
  } catch {
    // Failed transactions are not marked processed. Stripe can safely retry.
    console.error('Stripe event processing failed', { eventId: event.id, type: event.type })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
