import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Read-only evidence for an admin. This deliberately never clears holds or
// initiates/repeats a provider transaction based on a reconciliation guess.
export async function reviewOrderFinances(orderId: string) {
  const db = await createServiceRoleClient()
  const { data: order, error } = await db.from('orders').select('id,total,payment_charge_id,checkout_livemode,refunded_amount_cents').eq('id', orderId).single()
  if (error || !order?.payment_charge_id) throw new Error('Verified charge unavailable')
  const { data: operations, error: operationError } = await db.from('financial_operations').select('id,kind,status,amount_cents,provider_id,reversal_id,created_at').eq('order_id', orderId)
  if (operationError) throw new Error('Operation audit unavailable')
  const charge = await stripe.charges.retrieve(order.payment_charge_id)
  if (charge.currency !== 'usd' || charge.livemode !== order.checkout_livemode || charge.amount !== Math.round(Number(order.total) * 100)) throw new Error('Charge does not match order')
  const [refunds, transfers] = await Promise.all([
    stripe.refunds.list({ charge: charge.id, limit: 100 }),
    stripe.transfers.list({ transfer_group: orderId, limit: 100 }),
  ])
  const warnings: string[] = []
  if (charge.disputed) warnings.push('This charge has a dispute. Review the case in Stripe before any refund or vendor transfer.')
  if (!charge.paid) warnings.push('Stripe does not report this charge as paid.')
  if (charge.amount_refunded !== Number(order.refunded_amount_cents)) warnings.push('Stripe and the saved refund ledger differ. Keep funds on hold until the difference is reconciled.')
  if (refunds.has_more || transfers.has_more) warnings.push('More than 100 provider records exist. This report is incomplete; inspect the full provider history.')
  const known = (provider: { id: string; metadata: { [key: string]: string } | null }, kind: string) => (operations || []).find(op => op.kind === kind && (op.provider_id === provider.id || op.id === provider.metadata?.operation_id))
  const refundRows = refunds.data.map(refund => {
    const operation = known(refund, 'refund')
    if (!operation) warnings.push(`Refund ${refund.id} is not linked to a recorded website operation. Its item allocation needs review.`)
    if (refund.status === 'failed' || refund.status === 'canceled') warnings.push(`Refund ${refund.id} did not complete. Inspect its failure in Stripe; do not create a separate refund from this report.`)
    if (operation && (Number(operation.amount_cents) !== refund.amount || (operation.provider_id && operation.provider_id !== refund.id))) warnings.push(`Refund ${refund.id} differs from its saved operation. Manual reconciliation is required.`)
    return { id: refund.id, amountCents: refund.amount, status: refund.status, operationId: operation?.id || null }
  })
  const transferRows = transfers.data.map(transfer => {
    const operation = known(transfer, 'transfer')
    if (!operation) warnings.push(`Transfer ${transfer.id} is not linked to a recorded website operation.`)
    if (transfer.amount_reversed > 0) warnings.push(`Transfer ${transfer.id} has reversed funds. Compare them with the website return records.`)
    const source = typeof transfer.source_transaction === 'string' ? transfer.source_transaction : transfer.source_transaction?.id
    if (source !== charge.id || transfer.currency !== 'usd' || (operation && Number(operation.amount_cents) !== transfer.amount)) warnings.push(`Transfer ${transfer.id} differs from the saved charge or operation.`)
    return { id: transfer.id, amountCents: transfer.amount, reversedCents: transfer.amount_reversed, operationId: operation?.id || null }
  })
  for (const op of operations || []) {
    if (op.status === 'pending') warnings.push(`Website ${op.kind} ${op.id.slice(0, 8)} remains unconfirmed. Use the existing operation's review screen; do not issue a separate transaction.`)
  }
  return { orderId, checkedAt: new Date().toISOString(), live: charge.livemode, paid: charge.paid, disputed: charge.disputed,
    totalCents: charge.amount, providerRefundedCents: charge.amount_refunded, recordedRefundedCents: Number(order.refunded_amount_cents),
    incomplete: refunds.has_more || transfers.has_more, refunds: refundRows, transfers: transferRows, warnings,
    notice: 'Read-only comparison. No money moved, no accounting records changed and no holds cleared. A report without warnings is not payout approval.' }
}
