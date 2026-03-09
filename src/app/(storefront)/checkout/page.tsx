'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'
import { Lock, CreditCard, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Shipping form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [apartment, setApartment] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsLoggedIn(true)
        setEmail(user.email || '')
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (profile?.full_name) {
          const parts = profile.full_name.split(' ')
          setFirstName(parts[0] || '')
          setLastName(parts.slice(1).join(' ') || '')
        }
      }
    }
    checkAuth()
  }, [])

  const subtotal = total()
  const tax = Math.round(subtotal * 0.08 * 100) / 100
  const shipping = subtotal >= 50 ? 0 : 5.99
  const orderTotal = Math.round((subtotal + tax + shipping) * 100) / 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    if (!isLoggedIn) {
      setError('Please sign in to complete your order.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingAddress: {
            name: `${firstName} ${lastName}`.trim(),
            line1: address,
            line2: apartment,
            city,
            state,
            postal_code: zip,
            country: 'US',
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed')
      }

      setSuccess(true)
      clearCart()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="section-padding py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-6 flex items-center justify-center">
            <Check size={32} className="text-green-600" />
          </div>
          <h1 className="font-display text-2xl font-semibold mb-3">Order Placed!</h1>
          <p className="text-gray-500 mb-8">Thank you for your order. You'll receive a confirmation email shortly.</p>
          <button onClick={() => router.push('/account/orders')} className="btn-primary">View My Orders</button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="section-padding py-20 text-center">
        <h1 className="font-display text-2xl font-semibold mb-3">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Add some items to checkout.</p>
        <button onClick={() => router.push('/')} className="btn-primary">Start Shopping</button>
      </div>
    )
  }

  return (
    <div className="section-padding py-8 md:py-12">
      <h1 className="font-display text-2xl font-bold mb-8 flex items-center gap-3">
        <Lock size={24} className="text-green-600" />
        Secure Checkout
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div className="space-y-8">
            {error && <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

            {!isLoggedIn && (
              <div className="p-4 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                <a href="/login?redirect=/checkout" className="font-semibold underline">Sign in</a> to complete your order.
              </div>
            )}

            {/* Contact */}
            <div>
              <h2 className="font-semibold text-lg mb-4">Contact Information</h2>
              <input type="email" placeholder="Email address" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            {/* Shipping */}
            <div>
              <h2 className="font-semibold text-lg mb-4">Shipping Address</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="First name" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  <input type="text" placeholder="Last name" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
                <input type="text" placeholder="Address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} required />
                <input type="text" placeholder="Apartment, suite, etc. (optional)" className="input" value={apartment} onChange={(e) => setApartment(e.target.value)} />
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" placeholder="City" className="input" value={city} onChange={(e) => setCity(e.target.value)} required />
                  <input type="text" placeholder="State" className="input" value={state} onChange={(e) => setState(e.target.value)} required />
                  <input type="text" placeholder="ZIP code" className="input" value={zip} onChange={(e) => setZip(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div>
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CreditCard size={20} />
                Payment
              </h2>
              <div className="card p-6 bg-warm-100/50">
                <p className="text-sm text-gray-600 text-center">
                  Your order will be processed securely via Stripe.
                  <br />
                  <span className="text-xs text-gray-400 mt-1 block">Payment is collected when you place your order.</span>
                </p>
              </div>
            </div>

            <button type="submit" disabled={loading || !isLoggedIn} className="btn-primary w-full text-base py-4">
              {loading ? 'Processing...' : `Place Order — ${formatPrice(orderTotal)}`}
            </button>
          </div>

          {/* Order summary */}
          <div className="card p-6 h-fit sticky top-24">
            <h2 className="font-semibold text-lg mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={`${item.product.id}-${item.variant?.id}`} className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg bg-warm-100 flex items-center justify-center text-xl flex-shrink-0 relative overflow-hidden">
                    {item.product.images?.[0]?.url ? (
                      <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : '🛍️'}
                    <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.product.title}</p>
                    {item.variant && <p className="text-xs text-gray-500">{item.variant.value}</p>}
                  </div>
                  <span className="text-sm font-medium">{formatPrice((item.product.price + (item.variant?.price_adjustment || 0)) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-warm-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className={shipping === 0 ? 'text-green-600' : ''}>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax (8%)</span><span>{formatPrice(tax)}</span></div>
              <div className="border-t border-warm-border my-2" />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatPrice(orderTotal)}</span></div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
