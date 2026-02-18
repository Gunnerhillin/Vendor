'use client'

import { Search } from 'lucide-react'
import ProductCard from '@/components/storefront/ProductCard'
import type { Product } from '@/types'

const results: Product[] = []

export default function SearchPage() {
  return (
    <div className="page-container py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <Search size={24} className="text-gray-400" />
        <h1 className="section-title">Search Results</h1>
      </div>
      {results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No results found — try a different search term</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-8">{results.length} results found</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
