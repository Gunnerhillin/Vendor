'use client'

import ProductCard from '@/components/storefront/ProductCard'
import type { Product } from '@/types'

const vendor = null
const products: Product[] = []

export default function VendorStorefrontPage() {
  if (!vendor) {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-gray-400">Vendor not found</p>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-accent-light to-[#D4B896] py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-white mx-auto mb-5 flex items-center justify-center text-3xl font-display font-bold shadow-lg">
          ?
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">Vendor Shop</h1>
        <p className="text-gray-600 max-w-md mx-auto text-sm mb-6">Shop coming soon</p>
      </div>

      {/* Products */}
      <div className="page-container py-12">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="section-title">All Products</h2>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No products available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
