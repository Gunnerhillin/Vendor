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
