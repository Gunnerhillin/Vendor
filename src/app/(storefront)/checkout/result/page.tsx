"use client"
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'

type Order = { id: string; status: string; paid: boolean; total: number }
function Result() {
  const params = useSearchParams()
  const id = params.get('order')
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    async function check() {
      try {
        const response = await fetch(`/api/checkout/status?order=${encodeURIComponent(id || '')}`, { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to check payment.')
        if (!active) return
        setOrder(data.order); setError('')
        if (data.order.paid) {
          if (!useCart.persist.hasHydrated()) await useCart.persist.rehydrate()
          useCart.getState().consumeOrder(data.order.id, data.order.cart || [])
        }
        if (data.order.paid || data.order.status === 'cancelled') {
          sessionStorage.removeItem('checkout-attempt')
          return
        }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Unable to check payment.') }
      if (active && ++attempts < 20) timer = setTimeout(check, 3000)
    }
    check()
    return () => { active = false; clearTimeout(timer) }
  }, [id])
  async function cancel() {
    setBusy(true)
    try {
      const response = await fetch('/api/checkout/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: id }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (data.cancelled) { sessionStorage.removeItem('checkout-attempt'); setOrder(previous => previous ? { ...previous, status: 'cancelled' } : null) }
      else window.location.reload()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to cancel checkout.') }
    finally { setBusy(false) }
  }
  return <main className="max-w-xl mx-auto px-4 py-16 space-y-5">
    <h1 className="text-3xl font-bold">{order?.paid ? 'Payment confirmed' : order?.status === 'cancelled' ? 'Checkout cancelled' : 'Checking your payment'}</h1>
    <p>{order?.paid ? 'Your order is confirmed. Each brand will prepare and ship its items separately. Purchased quantities have been removed from your cart.' : order?.status === 'cancelled' ? 'This checkout is closed. Your cart is saved.' : 'An order is confirmed only after we verify payment. If you already paid, please check your order history before starting another checkout.'}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {order && !order.paid && order.status !== 'cancelled' && <button disabled={busy} onClick={cancel} className="border rounded-lg px-4 py-2">{busy ? 'Checking…' : 'Cancel this checkout'}</button>}
    <div className="flex gap-6"><Link href="/account/orders" className="underline">Order history</Link><Link href="/cart" className="underline">Review cart</Link></div>
    {!order?.paid && <button onClick={() => window.location.reload()} className="underline">Check again</button>}
  </main>
}
export default function CheckoutResult() { return <Suspense fallback={<p className="p-12">Checking payment…</p>}><Result /></Suspense> }
