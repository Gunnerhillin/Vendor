import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'
const objectId=(value: string | {id:string} | null | undefined)=>typeof value==='string'?value:value?.id
export async function reconcileManagedRefund(refund: Stripe.Refund) {
  const id=refund.metadata?.operation_id
  if(!id) return false
  const db=await createServiceRoleClient()
  const {data:operation,error}=await db.from('financial_operations').select('*').eq('id',id).eq('kind','refund').single()
  if(error || !operation || objectId(refund.charge)!==operation.charge_id || refund.amount!==Number(operation.amount_cents) || refund.currency!=='usd') throw new Error('Refund operation mismatch')
  if(operation.provider_id && operation.provider_id!==refund.id) throw new Error('Refund provider ID changed; reconcile manually')
  const {error:saveError}=await db.from('financial_operations').update({provider_id:refund.id}).eq('id',operation.id)
  if(saveError) throw new Error('Unable to record refund')
  if(refund.status==='succeeded') {
    const {error}=await db.rpc('finish_financial_operation',{operation_arg:operation.id,provider_arg:refund.id})
    if(error) throw new Error('Refund accounting needs reconciliation')
  }
  return true
}
export async function executeFinancialOperation(operation: any) {
  const db=await createServiceRoleClient()
  const {data:order,error}=await db.from('orders').select('checkout_livemode,refunded_amount_cents,total').eq('id',operation.order_id).single()
  if(error || !order) throw new Error('Order unavailable')
  const charge=await stripe.charges.retrieve(operation.charge_id)
  if(charge.livemode!==order.checkout_livemode || !charge.paid || charge.disputed || charge.currency!=='usd' || charge.amount!==Math.round(Number(order.total)*100)) throw new Error('Charge needs review')
  if(charge.livemode && process.env.ENABLE_LIVE_FINANCIAL_OPERATIONS!=='true') throw new Error('Live refunds and transfers are not enabled')
  const fresh=()=>{if(Date.now()-new Date(operation.created_at).getTime()>23*60*60*1000) throw new Error('Operation needs manual provider reconciliation before retry')}
  const save=async(values:Record<string,unknown>)=>{const {error}=await db.from('financial_operations').update(values).eq('id',operation.id);if(error)throw new Error('Unable to save provider result')}
  if(operation.kind==='transfer') {
    let transfer:Stripe.Transfer|undefined
    if(operation.provider_id) transfer=await stripe.transfers.retrieve(operation.provider_id)
    else await stripe.transfers.list({transfer_group:operation.order_id,limit:100}).autoPagingEach(t=>{if(t.metadata.operation_id===operation.id)transfer=t})
    if(!transfer) {
      fresh()
      if(charge.amount_refunded!==Number(order.refunded_amount_cents)) throw new Error('External refunds need reconciliation')
      let pendingRefund=false
      await stripe.refunds.list({charge:charge.id,limit:100}).autoPagingEach(r=>{if(r.status==='pending'||r.status==='requires_action')pendingRefund=true})
      if(pendingRefund) throw new Error('Resolve pending refunds first')
      const account=await stripe.accounts.retrieve(operation.destination)
      if(!account.details_submitted || !account.payouts_enabled || account.capabilities?.transfers!=='active') throw new Error('Vendor payment account is not ready')
      transfer=await stripe.transfers.create({amount:Number(operation.amount_cents),currency:'usd',destination:operation.destination,source_transaction:operation.charge_id,transfer_group:operation.order_id,metadata:{operation_id:operation.id}}, {idempotencyKey:`finance-transfer:${operation.id}`})
    }
    if(transfer.amount!==Number(operation.amount_cents)||transfer.currency!=='usd'||objectId(transfer.destination)!==operation.destination||objectId(transfer.source_transaction)!==operation.charge_id||transfer.amount_reversed!==0) throw new Error('Transfer needs reconciliation')
    await save({provider_id:transfer.id})
    const {error}=await db.rpc('finish_financial_operation',{operation_arg:operation.id,provider_arg:transfer.id})
    if(error) throw new Error('Transfer accounting needs reconciliation')
    return {status:'succeeded',kind:'transfer',providerId:transfer.id}
  }
  let refund:Stripe.Refund|undefined
  if(operation.provider_id) refund=await stripe.refunds.retrieve(operation.provider_id)
  else await stripe.refunds.list({charge:charge.id,limit:100}).autoPagingEach(r=>{if(r.metadata?.operation_id===operation.id)refund=r})
  if(!refund) {
    fresh()
    if(charge.amount_refunded!==Number(order.refunded_amount_cents)) throw new Error('External refunds need reconciliation')
    let pendingRefund=false
    await stripe.refunds.list({charge:charge.id,limit:100}).autoPagingEach(r=>{if(r.status==='pending'||r.status==='requires_action')pendingRefund=true})
    if(pendingRefund) throw new Error('Resolve pending refunds first')
    if(operation.transfer_id && Number(operation.vendor_cents)>0) {
      let reversal:Stripe.TransferReversal|undefined
      if(operation.reversal_id) reversal=await stripe.transfers.retrieveReversal(operation.transfer_id,operation.reversal_id)
      else await stripe.transfers.listReversals(operation.transfer_id,{limit:100}).autoPagingEach(r=>{if(r.metadata?.operation_id===operation.id)reversal=r})
      if(!reversal) reversal=await stripe.transfers.createReversal(operation.transfer_id,{amount:Number(operation.vendor_cents),metadata:{operation_id:operation.id}},{idempotencyKey:`finance-reversal:${operation.id}`})
      if(reversal.amount!==Number(operation.vendor_cents)||objectId(reversal.transfer)!==operation.transfer_id) throw new Error('Transfer reversal mismatch')
      await save({reversal_id:reversal.id})
    }
    refund=await stripe.refunds.create({charge:operation.charge_id,amount:Number(operation.amount_cents),metadata:{operation_id:operation.id}},{idempotencyKey:`finance-refund:${operation.id}`})
  }
  await reconcileManagedRefund(refund)
  return {status:refund.status,kind:'refund',providerId:refund.id}
}
