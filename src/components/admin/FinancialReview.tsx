'use client'
import { useState } from 'react'
import type { reviewOrderFinances } from '@/lib/financial-review'
import { formatPrice } from '@/lib/utils'
export default function FinancialReview() {
  const [orderId, setOrderId] = useState('')
  const [report, setReport] = useState<Awaited<ReturnType<typeof reviewOrderFinances>> | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  async function check() {
    setBusy(true); setNotice(''); setReport(null)
    try {
      const response = await fetch(`/api/admin/finance/review?orderId=${encodeURIComponent(orderId.trim())}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setReport(data)
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Unable to load payment review') }
    finally { setBusy(false) }
  }
  return <section className="card p-6 space-y-3">
    <h2 className="font-semibold">Review a payment problem</h2>
    <p className="text-sm">Compare an order with Stripe before handling an uncertain refund, transfer or dispute. This check does not move money or clear holds.</p>
    <label className="block text-sm">Full order ID<input className="input mt-1" disabled={busy} value={orderId} onChange={e => { setOrderId(e.target.value); setReport(null) }} placeholder="Copy the full ID from the order or recovery list" /></label>
    <button className="btn-secondary" disabled={busy || !orderId.trim()} onClick={check}>{busy ? 'Checking Stripe…' : 'Compare payment records'}</button>
    <p role="status">{notice}</p>
    {report && <div className="space-y-3 text-sm">
      <p className="break-all">Order {report.orderId}</p>
      <p>{report.live ? 'Live payment' : 'Test payment'} · Checked {new Date(report.checkedAt).toLocaleString()}</p>
      <p>Total: {formatPrice(report.totalCents / 100)} · Stripe refunds: {formatPrice(report.providerRefundedCents / 100)} · Website refunds: {formatPrice(report.recordedRefundedCents / 100)}</p>
      <ul className="space-y-2">{report.warnings.map((warning, index) => <li key={index} className="bg-amber-50 text-amber-900 p-3 rounded break-words">{warning}</li>)}</ul>
      {!report.warnings.length && <p>No differences detected in this report. Delivery, return and approval requirements still apply.</p>}
      <h3 className="font-semibold">Stripe refunds</h3>
      {report.refunds.map(r => <p key={r.id} className="break-all">{r.id}: {formatPrice(r.amountCents / 100)} · {r.status || 'unknown'} · {r.operationId ? 'Linked to website operation' : 'Needs allocation review'}</p>)}
      <h3 className="font-semibold">Stripe transfers</h3>
      {report.transfers.map(t => <p key={t.id} className="break-all">{t.id}: {formatPrice(t.amountCents / 100)} · reversed {formatPrice(t.reversedCents / 100)}</p>)}
      <p>{report.notice}</p>
    </div>}
  </section>
}
