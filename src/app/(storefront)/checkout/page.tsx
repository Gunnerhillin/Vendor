"use client"
import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'

export default function CheckoutPage() {
  const { items, total } = useCart()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function checkout() {
    setBusy(true); setError('')
    try {
      const fingerprint = JSON.stringify(items.map(i => [i.product.id, i.variant?.id || null, i.quantity]).sort())
      const saved = JSON.parse(sessionStorage.getItem('checkout-attempt') || 'null')
      const checkoutKey = saved?.fingerprint === fingerprint ? saved.key : crypto.randomUUID()
      sessionStorage.setItem('checkout-attempt', JSON.stringify({ fingerprint, key: checkoutKey }))
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, checkoutKey }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to open checkout.')
      window.location.assign(data.url)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to open checkout. Please retry.'); setBusy(false) }
  }
  return <main className="max-w-2xl mx-auto px-4 py-12">
    <h1 className="text-3xl font-bold mb-6">Checkout</h1>
    {!items.length ? <p>Your cart is empty. <Link className="underline" href="/shop">Browse products</Link></p> : <>
      <ul className="divide-y">{items.map(item => <li className="py-4 flex justify-between gap-4" key={`${item.product.id}:${item.variant?.id || ''}`}><span>{item.product.title}{item.variant ? ` — ${item.variant.value}` : ''} × {item.quantity}</span><span>{formatPrice((item.product.price + (item.variant?.price_adjustment || 0)) * item.quantity)}</span></li>)}</ul>
      <div className="border-t py-5 space-y-2"><p className="flex justify-between font-semibold"><span>Subtotal</span><span>{formatPrice(total())}</span></p><p>Shipping is included in each vendor’s prices.</p><p>Tax and your final total are shown before payment. Each brand ships its items separately.</p><p className="text-sm text-gray-600">Enter your US delivery address and payment details securely on Stripe. Availability and prices are checked when you continue.</p></div>
      {error && <p role="alert" className="text-red-700 mb-4">{error} <Link href="/login" className="underline">Sign in</Link></p>}
      <button disabled={busy} onClick={checkout} className="w-full bg-pink-700 text-white rounded-xl px-6 py-3 disabled:opacity-50">{busy ? 'Opening secure checkout…' : 'Continue to secure payment'}</button>
    </>}
  </main>
}
