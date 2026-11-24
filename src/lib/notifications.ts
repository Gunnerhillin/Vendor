import { createServiceRoleClient } from '@/lib/supabase/server'
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!))
type Email = { from: string; to: string[]; subject: string; html: string }
export async function dispatchNotifications() {
  const key = process.env.RESEND_API_KEY
  const from = process.env.FROM_EMAIL
  const origin = process.env.NEXT_PUBLIC_APP_URL
  if (!key || key.includes('placeholder') || !from || !origin || !/^https:\/\//.test(origin)) throw new Error('Email delivery requires a verified sender, API key and HTTPS store URL.')
  const db = await createServiceRoleClient()
  const {data: jobs,error} = await db.rpc('claim_notifications',{batch_size:5})
  if(error) throw new Error('Unable to claim notification jobs.')
  let sent=0, failed=0
  for(const job of jobs || []) {
    try {
      let email: Email = job.email_snapshot
      if(!email) {
        const {data: order,error: orderError} = await db.from('orders').select('id,customer_id,checkout_email,payment_processed_at').eq('id',job.order_id).single()
        if(orderError || !order?.payment_processed_at) throw new Error('Paid order unavailable')
        let recipient = order.checkout_email
        const vendorMessage = ['vendor_order','vendor_return','vendor_transfer'].includes(job.kind)
        if(vendorMessage) {
          const {data: vendor} = await db.from('vendors').select('user_id').eq('id',job.vendor_id).single()
          if(!vendor) throw new Error('Vendor unavailable')
          const {data: profile} = await db.from('profiles').select('email').eq('id',vendor.user_id).single()
          recipient=profile?.email
        } else if(!recipient) {
          const {data: profile} = await db.from('profiles').select('email').eq('id',order.customer_id).single()
          recipient=profile?.email
        }
        if(!recipient) throw new Error('Recipient unavailable')
        const messages: Record<string,string> = {
          customer_order:'Your payment is confirmed. Each brand will prepare its items separately.',
          vendor_order:'You have a paid order ready to prepare. Open your orders to see the items and delivery address.',
          fulfillment:job.payload?.status === 'delivered' ? 'An item in your order has been marked delivered. Open your order for details.' : 'An item in your order has shipped. Open your order for carrier and tracking details.',
          vendor_return:'A customer has requested a return. Please open your returns to review it.',
          return_decision:'There is an update to your return request. Open your order to review the decision and instructions.',
          return_refunded:'Stripe has confirmed a refund for an item in your order. Open your order to review it. The time until the credit appears depends on your payment provider.',
          vendor_transfer:'Stripe has confirmed a transfer to your brand account. Open your earnings to review it. This is not confirmation of a bank payout.',
        }
        const message=messages[job.kind]
        if(!message) throw new Error('Unsupported notification')
        const path=vendorMessage ? job.kind==='vendor_return'?'/vendor/returns':job.kind==='vendor_transfer'?'/vendor/earnings':'/vendor/orders' : '/account/orders'
        email={from,to:[recipient],subject:`CutieValley order ${order.id.slice(0,8)} — update`,html:`<h1>CutieValley</h1><p>${escape(message)}</p><p><a href="${escape(origin+path)}">Open your ${vendorMessage?'vendor account':'order'}</a></p><p>Sign in to view private order details.</p>`}
        const {data: saved,error: saveError}=await db.from('notification_outbox').update({email_snapshot:email}).eq('id',job.id).eq('attempts',job.attempts).eq('status','sending').select('id').maybeSingle()
        if(saveError || !saved) throw new Error('Notification claim changed')
      }
      const response = await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`notification/${job.id}`},body:JSON.stringify(email),signal:AbortSignal.timeout(15000)})
      if(!response.ok) throw new Error('Provider did not accept notification')
      const result=await response.json()
      if(typeof result.id!=='string') throw new Error('Provider confirmation missing')
      const {error: saveError}=await db.from('notification_outbox').update({status:'sent',sent_at:new Date().toISOString(),provider_message_id:result.id,last_error:null}).eq('id',job.id).eq('attempts',job.attempts).eq('status','sending')
      if(saveError) throw new Error('Delivery receipt could not be saved')
      sent++
    } catch {
      failed++
      await db.from('notification_outbox').update({status:'failed',last_error:'Delivery not confirmed. Retry within 23 hours; older attempts require provider reconciliation.',next_attempt_at:new Date(Date.now()+Math.min(360,2**job.attempts)*60000).toISOString()}).eq('id',job.id).eq('attempts',job.attempts).eq('status','sending')
    }
  }
  return {sent,failed,claimed:(jobs || []).length}
}
