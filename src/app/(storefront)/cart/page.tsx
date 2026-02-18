'use client'

import Link from 'next/link'
import { ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, itemCount } = useCart()

  if (items.length === 0) {
    return (
      <div className="page-container py-20 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-200 mb-6" />
        <h1 className="font-display text-2xl font-semibold mb-3">Your bag is empty</h1>
        <p className="text-gray-500 mb-8">Looks like you haven&apos;t added any deals yet.</p>
        <Link href="/" className="btn-primary">Start Shopping &rarr;</Link>
      </div>
    )
  }

  return (
    <div className="page-container py-8 md:py-12">
      <h1 className="section-title mb-8">Shopping Bag ({itemCount()})</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={`${item.product.id}-${item.variant?.id}`} className="card p-6 flex gap-6">
              <div className="w-24 h-28 rounded-lg bg-warm-100 flex items-center justify-center text-3xl flex-shrink-0">
                🛍️
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{item.product.title}</h3>
                {item.variant && <p className="text-xs text-gray-500 mt-1">{item.variant.type}: {item.variant.value}</p>}
                <p className="text-lg font-bold mt-2">{formatPrice(item.product.price)}</p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border border-warm-border rounded-lg overflow-hidden">
                    <button onClick={() => updateQuantity(item.product.id, item.variant?.id || null, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center hover:bg-warm-100"><Minus size={14} /></button>
                    <span className="w-9 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.variant?.id || null, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center hover:bg-warm-100"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeItem(item.product.id, item.variant?.id || null)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card p-6 h-fit sticky top-24">
          <h2 className="font-semibold text-lg mb-6">Order Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatPrice(total())}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className="text-green-600 font-medium">Free</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="text-gray-400">Calculated at checkout</span></div>
            <div className="border-t border-warm-border my-4" />
            <div className="flex justify-between text-lg"><span className="font-semibold">Total</span><span className="font-bold">{formatPrice(total())}</span></div>
          </div>
          <Link href="/checkout" className="btn-primary w-full text-center mt-6">
            Proceed to Checkout
          </Link>
          <Link href="/" className="btn-secondary w-full text-center mt-3">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
