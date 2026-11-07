'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function GetStarted() {
  const [vendor, setVendor] = useState<any>()
  const [products, setProducts] = useState<any[]>([])
  const [message, setMessage] = useState('Loading your setup checklist…')
  useEffect(() => { (async () => {
    const db = createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) { setMessage('Sign in to set up your brand.'); return }
    const { data, error } = await db.from('vendors').select('*').eq('user_id', user.id).maybeSingle()
    if (error) { setMessage('Unable to load your brand. Please try again.'); return }
    if (!data) { setMessage('Your brand starts here. Submit an application with a few product examples.'); return }
    setVendor(data)
    const { data: items } = await db.from('products').select('id, status').eq('vendor_id', data.id)
    setProducts(items || [])
    setMessage('')
  })() }, [])
  const steps = vendor ? [
    { title: 'Apply to join', done: true, text: 'Your application has been received.', href: '/vendor/apply' },
    { title: 'Get approved', done: vendor.status === 'approved', text: `Application status: ${vendor.status}. Our team reviews every brand.`, href: '/vendor/settings' },
    { title: 'Set up your storefront', done: !!vendor.description && !!vendor.logo_url && !!vendor.shipping_policy, text: 'Add your story, logo and fulfillment details.', href: '/vendor/settings' },
    { title: 'Upload your first products', done: products.length > 0, text: `${products.length} products uploaded. Start with clear photos, prices and available stock.`, href: '/vendor/products' },
    { title: 'Product review', done: products.some(p => p.status === 'approved'), text: 'Approved products appear in the marketplace. Edits to listing content return to review.', href: '/vendor/products' },
    { title: 'Connect payouts', done: !!vendor.stripe_onboarding_complete, text: 'Complete payment-provider onboarding before accepting paid orders.', href: '/vendor/settings' },
  ] : []
  return <div className="max-w-3xl space-y-6">
    <h1 className="font-display text-3xl font-bold">Let’s launch your brand</h1>
    <p className="text-gray-600">Work through these steps at your own pace. Your saved progress stays here.</p>
    {message && <div className="card p-6"><p role="status">{message}</p><Link className="btn-primary mt-4" href="/vendor/apply">Apply to join</Link></div>}
    {steps.map((step, i) => <div key={step.title} className="card p-6 flex gap-4 items-start">
      <span className="font-bold text-accent-dark">{step.done ? '✓' : i + 1}</span>
      <div className="flex-1"><h2 className="font-semibold">{step.title}</h2><p className="text-sm text-gray-600 mt-1">{step.text}</p></div>
      <Link href={step.href} className="text-sm underline">{step.done ? 'Review' : 'Continue'}</Link>
    </div>)}
  </div>
}
