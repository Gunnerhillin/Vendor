'use client'

import ProductCard from '@/components/storefront/ProductCard'
import { CATEGORIES } from '@/lib/constants'
import type { Product } from '@/types'
import { useParams } from 'next/navigation'

const products: Product[] = []

export default function CategoryPage() {
  const params = useParams()
  const slug = params?.slug as string
  const category = CATEGORIES.find(c => c.slug === slug)

  return (
    <div className="page-container py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{category?.icon || '🛍️'}</span>
          <h1 className="section-title">{category?.name || 'All Products'}</h1>
        </div>
        <p className="text-sm text-gray-500">{products.length} deals available</p>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
        {['All', 'Under $25', '$25-$50', '$50+', 'Top Rated', 'New Arrivals'].map((filter) => (
          <button key={filter} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filter === 'All' ? 'bg-primary text-white' : 'bg-warm-100 text-gray-600 hover:bg-warm-200'}`}>
            {filter}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No products in this category yet — check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
