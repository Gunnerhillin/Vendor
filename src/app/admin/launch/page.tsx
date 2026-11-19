'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LaunchSetup() {
  const [vendors, setVendors] = useState<any[]>([])
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { (async () => {
    const { data, error } = await createClient().from('vendors').select('id,business_name,status,is_featured').order('business_name')
    if (error) setNotice(error.message)
    else setVendors(data || [])
  })() }, [])
  async function runOperation(path: string) {
    setSaving(true); setNotice('')
    try {
      const response=await fetch(path,{method:'POST'})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error)
      setNotice(path.includes('notifications') ? `${data.sent} emails accepted by provider; ${data.failed} need retry. Acceptance does not confirm inbox delivery.` : `${data.checked} reserved checkouts checked; ${data.failed} need retry.`)
    } catch(e) { setNotice(e instanceof Error ? e.message : 'Unable to run operation') }
    finally { setSaving(false) }
  }
  async function feature(id: string) {
    setSaving(true); setNotice('')
    const { error } = await createClient().rpc('feature_vendor', { target_id: id || null })
    if (error) setNotice(error.message)
    else { setVendors(vendors.map(v => ({ ...v, is_featured: v.id === id }))); setNotice('Spotlight updated.') }
    setSaving(false)
  }
  return <div className="max-w-3xl space-y-6">
    <h1 className="font-display text-3xl font-bold">Launch setup</h1>
    <section className="card p-6 space-y-3">
      <h2 className="font-semibold">Partner walkthrough</h2>
      <p className="text-sm">A plain-language tour of the storefront, brand setup and admin review. Share the guide freely; admin tools still require an authorized account.</p>
      <a className="btn-secondary inline-block" href="/guide/index.html">Open the walkthrough</a>
    </section>
    <section className="card p-6 space-y-3">
      <h2 className="font-semibold">Order recovery and notifications</h2>
      <p className="text-sm">Check up to 20 reserved payments with Stripe, or send up to 5 queued order emails. Email delivery requires a verified sender. Older uncertain sends require provider reconciliation before retrying.</p>
      <button disabled={saving} className="btn-secondary mr-3" onClick={()=>runOperation('/api/admin/operations')}>Check reserved payments</button>
      <button disabled={saving} className="btn-secondary" onClick={()=>runOperation('/api/admin/notifications')}>Send queued notifications</button>
    </section>
    <section className="card p-6 space-y-3">
      <h2 className="font-semibold">Invite founding brands</h2>
      <p className="text-sm text-gray-600">Share this application link with your outreach partner. Each brand creates its own account, submits samples, and receives a setup checklist.</p>
      <a className="block underline break-all" href="/vendor/apply">https://www.cutievalley.com/vendor/apply</a>
      <button className="btn-secondary" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/vendor/apply`); setNotice('Application link copied.') } catch { setNotice('Copy the application link above.') } }}>Copy application link</button>
    </section>
    <section className="card p-6 space-y-3">
      <h2 className="font-semibold">Featured brand</h2>
      <label className="block text-sm" htmlFor="brand">Choose an approved brand for the homepage spotlight</label>
      <select id="brand" className="input" disabled={saving} value={vendors.find(v => v.is_featured)?.id || ''} onChange={e => feature(e.target.value)}>
        <option value="">No featured brand yet</option>
        {vendors.filter(v => v.status === 'approved').map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
      </select>
    </section>
    <p role="status" className="text-sm">{notice}</p>
  </div>
}
