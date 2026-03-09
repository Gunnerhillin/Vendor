import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    if (webhookSecret && webhookSecret !== 'whsec_placeholder' && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      // Dev mode - parse body directly
      event = JSON.parse(body)
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_id', paymentIntent.id)
          .single()

        if (order) {
          await supabase.from('orders').update({ status: 'processing' }).eq('id', order.id)

          await supabase
            .from('order_items')
            .update({ status: 'processing' })
            .eq('order_id', order.id)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_id', paymentIntent.id)
          .single()

        if (order) {
          await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        if (charge.payment_intent) {
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_payment_id', charge.payment_intent)
            .single()

          if (order) {
            await supabase.from('orders').update({ status: 'refunded' }).eq('id', order.id)
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
