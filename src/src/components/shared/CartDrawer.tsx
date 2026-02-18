'use client'

import { X, Minus, Plus, ShoppingBag } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'

export default function CartDrawer() {
  const { items, isOpen, toggleCart, removeItem, updateQuantity, total, itemCount } = useCart()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={toggleCart} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-down">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <ShoppingBag size={20} />
            Your Bag ({itemCount()})
          </h2>
          <button onClick={toggleCart} className="p-2 hover:bg-warm-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Your bag is empty</p>
              <p className="text-sm text-gray-400 mt-1">Start shopping to add items</p>
              <button onClick={toggleCart} className="btn-primary mt-6 btn-sm">
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.product.id}-${item.variant?.id}`} className="flex gap-4">
                {/* Image placeholder */}
                <div className="w-20 h-24 rounded-lg bg-warm-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {item.product.images?.[0] ? '🛍️' : '📦'}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate">{item.product.title}</h3>
                  {item.variant && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.variant.type}: {item.variant.value}
                    </p>
                  )}
                  <p className="text-sm font-bold mt-1">
                    {formatPrice(item.product.price + (item.variant?.price_adjustment || 0))}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-warm-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.variant?.id || null, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-warm-100 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.variant?.id || null, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-warm-100 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id, item.variant?.id || null)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-warm-border p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold text-lg">{formatPrice(total())}</span>
            </div>
            <p className="text-xs text-gray-400">Shipping and taxes calculated at checkout</p>
            <Link
              href="/checkout"
              onClick={toggleCart}
              className="btn-primary w-full text-center"
            >
              Proceed to Checkout
            </Link>
            <button onClick={toggleCart} className="btn-secondary w-full">
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
