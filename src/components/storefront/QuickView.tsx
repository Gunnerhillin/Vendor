'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ShoppingBag, Minus, Plus, Star, ExternalLink } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useToast } from '@/components/shared/Toast'
import { formatPrice, calculateDiscount } from '@/lib/utils'
import type { Product, ProductVariant } from '@/types'

interface QuickViewProps {
  product: Product | null
  onClose: () => void
}

export default function QuickView({ product, onClose }: QuickViewProps) {
  const addItem = useCart((s) => s.addItem)
  const toggleCart = useCart((s) => s.toggleCart)
  const { toast } = useToast()
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden'
      setQuantity(1)
      setSelectedVariant(null)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [product])

  if (!product) return null

  const discount = product.compare_at_price ? calculateDiscount(product.price, product.compare_at_price) : 0
  const effectivePrice = product.price + (selectedVariant?.price_adjustment || 0)
  const mainImage = product.images?.[0]?.url
  const sizeVariants = product.variants?.filter(v => v.type === 'size') || []
  const colorVariants = product.variants?.filter(v => v.type === 'color') || []

  const handleAdd = () => {
    addItem(product, selectedVariant, quantity)
    toggleCart()
    toast(`${product.title} added to bag`, 'cart')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative aspect-square bg-warm-100">
            {mainImage ? (
              <Image src={mainImage} alt={product.title} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">🛍️</div>
            )}
            {discount > 0 && (
              <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col">
            {product.vendor && (
              <p className="text-xs font-semibold text-accent-dark uppercase tracking-wide mb-1">{product.vendor.business_name}</p>
            )}
            <h2 className="font-display text-lg font-bold mb-2 line-clamp-2">{product.title}</h2>

            {/* Rating */}
            {product.rating_count > 0 && (
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14} className={s <= Math.round(product.rating_avg || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                ))}
                <span className="text-xs text-gray-500 ml-1">({product.rating_count})</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold">{formatPrice(effectivePrice)}</span>
              {product.compare_at_price && (
                <span className="text-sm text-gray-400 line-through">{formatPrice(product.compare_at_price)}</span>
              )}
            </div>

            {/* Description snippet */}
            {product.description && (
              <p className="text-sm text-gray-500 line-clamp-3 mb-4">{product.description}</p>
            )}

            {/* Size Variants */}
            {sizeVariants.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium mb-1.5">Size</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizeVariants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                      disabled={v.inventory_count === 0}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                        selectedVariant?.id === v.id ? 'border-accent bg-accent/10 text-accent-dark' : 'border-warm-border hover:border-accent'
                      } ${v.inventory_count === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {v.value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Variants */}
            {colorVariants.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium mb-1.5">Color</p>
                <div className="flex flex-wrap gap-1.5">
                  {colorVariants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                        selectedVariant?.id === v.id ? 'border-accent bg-accent/10 text-accent-dark' : 'border-warm-border hover:border-accent'
                      }`}
                    >
                      {v.value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="mt-auto space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-warm-border rounded-lg overflow-hidden">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-warm-100"><Minus size={14} /></button>
                  <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-warm-100"><Plus size={14} /></button>
                </div>
                <span className="text-xs text-gray-400">{product.inventory_count} available</span>
              </div>

              <button
                onClick={handleAdd}
                disabled={product.inventory_count === 0}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                <ShoppingBag size={18} />
                {product.inventory_count === 0 ? 'Out of Stock' : 'Add to Bag'}
              </button>

              <Link
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 text-sm text-accent-dark font-medium hover:underline"
              >
                View Full Details <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
