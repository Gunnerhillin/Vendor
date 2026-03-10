'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { formatPrice, calculateDiscount } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const discount = product.compare_at_price
    ? calculateDiscount(product.price, product.compare_at_price)
    : 0

  const inventoryPercent = product.inventory_count > 0
    ? Math.round((product.inventory_count / (product.inventory_count + product.sold_count)) * 100)
    : 0

  return (
    <Link href={`/products/${product.slug}`} className="group bg-white rounded-2xl shadow-soft overflow-hidden transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1.5">
      {/* Image */}
      <div className="relative aspect-[4/5] bg-gradient-to-br from-warm-100 to-accent-light flex items-center justify-center overflow-hidden">
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <span className="text-5xl">🛍️</span>
        )}

        {/* Badges */}
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm">
            {discount}% OFF
          </span>
        )}
        {product.is_preorder && (
          <span className="absolute top-3 left-3 bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm">
            Pre-order
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md
                     opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0
                     transition-all duration-300 ease-out
                     hover:scale-110 hover:bg-white"
        >
          <Heart size={16} />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        {product.vendor && (
          <p className="text-[11px] font-semibold text-accent-dark uppercase tracking-wide mb-1">
            {product.vendor.business_name}
          </p>
        )}
        <h3 className="text-sm font-medium text-primary leading-snug line-clamp-2 mb-2 transition-colors duration-300 group-hover:text-accent-dark">
          {product.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{formatPrice(product.price)}</span>
          {product.compare_at_price && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
          {discount > 0 && (
            <span className="text-xs font-bold text-red-500">-{discount}%</span>
          )}
        </div>

        {/* Rating */}
        {product.rating_count > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span className="text-amber-400">{'★'.repeat(Math.round(product.rating_avg))}</span>
            <span>({product.rating_count})</span>
            {product.sold_count > 100 && (
              <span>{product.sold_count > 1000 ? `${(product.sold_count / 1000).toFixed(1)}k` : product.sold_count} sold</span>
            )}
          </div>
        )}

        {/* Scarcity bar */}
        {inventoryPercent > 0 && inventoryPercent < 40 && (
          <div className="mt-2.5">
            <div className="h-1 bg-warm-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-red-400 rounded-full transition-all duration-1000"
                style={{ width: `${inventoryPercent}%` }}
              />
            </div>
            <p className="text-[11px] font-semibold text-red-500 mt-1">
              Almost gone — {inventoryPercent}% left
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}
