'use client'
import { useEffect, useState } from 'react'
import type { serviceReadiness } from '@/lib/service-readiness'
export default function ServiceReadiness() {
  const [data, setData] = useState<ReturnType<typeof serviceReadiness> | null>(null)
  const [error, setError] = useState('')
  async function refresh() {
    setError('')
    try {
      const response = await fetch('/api/admin/readiness', { cache: 'no-store' })
      if (!response.ok) throw new Error('Unable to check service setup. Refresh or sign in again.')
      setData(await response.json())
    } catch (e) { setData(null); setError(e instanceof Error ? e.message : 'Unable to check setup') }
  }
  useEffect(() => { void refresh() }, [])
  return <section className="card p-6 space-y-3">
    <h2 className="font-semibold">Service setup</h2>
    <p className="text-sm">These checks show whether configuration is present. They do not certify that payments, emails or scheduled jobs work. No secret values are displayed.</p>
    {data && <>
      <p className="text-sm">Payment credentials: <strong>{data.stripeMode}</strong>. Live checkout server switch: <strong>{data.liveCheckoutAllowed ? 'on' : 'off'}</strong>. Live refunds and transfers switch: <strong>{data.liveFinancialOperationsAllowed ? 'on' : 'off'}</strong>. Store policy and brand checks also apply.</p>
      <ul className="space-y-3">{data.checks.map(check => <li key={check.name} className="border rounded p-3"><strong>{check.name}: {check.configured ? 'Configuration present' : 'Setup needed'}</strong><p className="text-sm text-gray-600">{check.detail}</p></li>)}</ul>
    </>}
    <p role="status">{error || (!data ? 'Checking setup…' : '')}</p>
    <button className="btn-secondary" onClick={refresh}>Refresh service checks</button>
  </section>
}
