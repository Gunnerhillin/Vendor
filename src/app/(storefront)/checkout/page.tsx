'use client'

import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'
import { Lock, CreditCard } from 'lucide-react'

export default function CheckoutPage() {
  const { items, total } = useCart()

  return (
    <div className="page-container py-8 md:py-12">
      <h1 className="section-title mb-8 flex items-center gap-3">
        <Lock size={24} className="text-green-600" />
        Secure Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Form */}
        <div className="space-y-8">
          {/* Contact */}
          <div>
            <h2 className="font-semibold text-lg mb-4">Contact Information</h2>
            <input type="email" placeholder="Email address" className="input" />
          </div>

          {/* Shipping */}
          <div>
            <h2 className="font-semibold text-lg mb-4">Shipping Address</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="First name" className="input" />
                <input type="text" placeholder="Last name" className="input" />
              </div>
              <input type="text" placeholder="Address" className="input" />
              <input type="text" placeholder="Apartment, suite, etc. (optional)" className="input" />
              <div className="grid grid-cols-3 gap-3">
                <input type="text" placeholder="City" className="input" />
                <input type="text" placeholder="State" className="input" />
                <input type="text" placeholder="ZIP code" className="input" />
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
              <p className="text-sm text-gray-500 text-center">
                Stripe Connect payment form will be integrated here.
                <br />
                <span className="text-xs text-gray-400 mt-1 block">Secure payment processing with automatic commission split.</span>
              </p>
            </div>
          </div>

          <button className="btn-primary w-full text-base py-4">
            Place Order — {formatPrice(total())}
          </button>
        </div>

        {/* Order summary */}
        <div className="card p-6 h-fit sticky top-24">
          <h2 className="font-semibold text-lg mb-6">Order Summary</h2>
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.variant?.id}`} className="flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-warm-100 flex items-center justify-center text-xl flex-shrink-0 relative">
                  🛍️
                  <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.product.title}</p>
                  {item.variant && <p className="text-xs text-gray-500">{item.variant.value}</p>}
                </div>
                <span className="text-sm font-medium">{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-warm-border pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(total())}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className="text-green-600">Free</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>$0.00</span></div>
            <div className="border-t border-warm-border my-2" />
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatPrice(total())}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
