'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'
import { Lock, CreditCard, Check, Truck, Loader2, Tag, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ShippingRate {
  id: string
  carrier: string
  service: string
  rate: string
  delivery_days: number | null
}

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

  // Shipping rates
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [shipmentId, setShipmentId] = useState<string | null>(null)

  // Coupon
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number; description: string } | null>(null)
  const [couponError, setCouponError] = useState('')

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal: total }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCouponError(data.error)
      } else {
        setAppliedCoupon(data.coupon)
        setCouponCode('')
      }
    } catch {
      setCouponError('Failed to validate coupon')
    } finally {
      setCouponLoading(false)
    }
  }

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

  // Fetch shipping rates when address is filled
  const fetchRates = useCallback(async () => {
    if (!address || !city || !state || !zip) return

    setRatesLoading(true)
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            name: `${firstName} ${lastName}`.trim() || 'Customer',
            street1: address,
            street2: apartment,
            city,
            state,
            zip,
            country: 'US',
          },
        }),
      })
      const data = await res.json()
      if (data.rates) {
        setShippingRates(data.rates)
        setShipmentId(data.shipmentId)
        // Auto-select cheapest rate
        if (data.rates.length > 0 && !selectedRate) {
          setSelectedRate(data.rates[0])
        }
      }
    } catch (err) {
      console.error('Failed to fetch rates:', err)
    } finally {
      setRatesLoading(false)
    }
  }, [address, city, state, zip, firstName, lastName, apartment, selectedRate])

  // Auto-fetch rates when zip changes (debounced)
  useEffect(() => {
    if (zip.length >= 5 && address && city && state) {
      const timeout = setTimeout(fetchRates, 600)
      return () => clearTimeout(timeout)
    }
  }, [zip, address, city, state, fetchRates])

  const subtotal = total()
  const couponDiscount = appliedCoupon?.discount || 0
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount)
  const tax = Math.round(discountedSubtotal * 0.08 * 100) / 100
  const shippingCost = selectedRate
    ? (subtotal >= 50 ? 0 : parseFloat(selectedRate.rate))
    : (subtotal >= 50 ? 0 : 5.99)
  const orderTotal = Math.round((discountedSubtotal + tax + shippingCost) * 100) / 100

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
          shippingRate: selectedRate ? {
            id: selectedRate.id,
            carrier: selectedRate.carrier,
            service: selectedRate.service,
            cost: shippingCost,
            shipmentId,
          } : undefined,
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
          <p className="text-gray-500 mb-8">Thank you for your order. You&apos;ll receive a confirmation email shortly.</p>
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

            {/* Shipping Method */}
            <div>
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Truck size={20} />
                Shipping Method
              </h2>

              {ratesLoading ? (
                <div className="card p-6 flex items-center justify-center gap-2 text-gray-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Getting shipping rates...</span>
                </div>
              ) : shippingRates.length > 0 ? (
                <div className="space-y-2">
                  {shippingRates.slice(0, 4).map((rate) => {
                    const cost = subtotal >= 50 ? 0 : parseFloat(rate.rate)
                    const isSelected = selectedRate?.id === rate.id
                    return (
                      <label
                        key={rate.id}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-accent bg-accent/5'
                            : 'border-warm-border hover:border-accent/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping_rate"
                            checked={isSelected}
                            onChange={() => setSelectedRate(rate)}
                            className="accent-accent"
                          />
                          <div>
                            <p className="text-sm font-medium">{rate.carrier} — {rate.service}</p>
                            {rate.delivery_days && (
                              <p className="text-xs text-gray-400">
                                {rate.delivery_days === 1 ? 'Next day delivery' : `${rate.delivery_days} business days`}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-semibold ${cost === 0 ? 'text-green-600' : ''}`}>
                          {cost === 0 ? 'Free' : formatPrice(cost)}
                        </span>
                      </label>
                    )
                  })}
                  {subtotal >= 50 && (
                    <p className="text-xs text-green-600 mt-1 pl-1">Free shipping applied on orders over $50</p>
                  )}
                </div>
              ) : (
                <div className="card p-4 bg-warm-100/50">
                  <p className="text-sm text-gray-500 text-center">
                    {address && city && state && zip
                      ? 'Unable to fetch rates — using standard shipping'
                      : 'Enter your address to see shipping options'}
                  </p>
                  {subtotal >= 50 && (
                    <p className="text-xs text-green-600 text-center mt-1">Free shipping on orders over $50</p>
                  )}
                </div>
              )}
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
            {/* Coupon Code */}
            <div className="border-t border-warm-border pt-4 mb-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">{appliedCoupon.code}</span>
                    <span className="text-xs text-green-600">({appliedCoupon.description})</span>
                  </div>
                  <button onClick={() => setAppliedCoupon(null)} className="text-green-600 hover:text-green-800"><X size={14} /></button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                      placeholder="Promo code"
                      className="input flex-1 text-sm"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="btn-outline text-sm px-4 disabled:opacity-40"
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                </div>
              )}
            </div>

            <div className="border-t border-warm-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({appliedCoupon.description})</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className={shippingCost === 0 ? 'text-green-600' : ''}>
                  {shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}
                </span>
              </div>
              {selectedRate && shippingCost > 0 && (
                <p className="text-[11px] text-gray-400 text-right">{selectedRate.carrier} {selectedRate.service}</p>
              )}
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
