'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'
import ProductCard from '@/components/storefront/ProductCard'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types'

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
      <SearchContent />
    </Suspense>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const sortParam = searchParams.get('sort') || 'newest'

  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(query)
  const [sort, setSort] = useState(sortParam)
  const [priceFilter, setPriceFilter] = useState('all')

  useEffect(() => {
    fetchResults()
  }, [query, sort])

  async function fetchResults() {
    setLoading(true)
    const supabase = createClient()

    let q = supabase
      .from('products')
      .select('*, images:product_images(id, url, alt, sort_order), vendor:vendors(id, business_name, slug)')
      .eq('status', 'approved')

    if (query) {
      q = q.textSearch('search_vector', query.split(' ').join(' & '))
    }

    switch (sort) {
      case 'price_asc': q = q.order('price', { ascending: true }); break
      case 'price_desc': q = q.order('price', { ascending: false }); break
      case 'popular': q = q.order('sold_count', { ascending: false }); break
      case 'rating': q = q.order('rating_avg', { ascending: false }); break
      default: q = q.order('created_at', { ascending: false })
    }

    q = q.limit(48)

    const { data } = await q
    let products = (data || []) as Product[]

    // Client-side price filter
    if (priceFilter === 'under25') products = products.filter(p => p.price < 25)
    else if (priceFilter === '25to50') products = products.filter(p => p.price >= 25 && p.price <= 50)
    else if (priceFilter === 'over50') products = products.filter(p => p.price > 50)

    setResults(products)
    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchInput)}&sort=${sort}`
    }
  }

  return (
    <div className="section-padding py-8 md:py-12">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search deals, brands, and more..."
            className="w-full pl-12 pr-4 py-4 rounded-full border-2 border-warm-border bg-warm-100 text-base focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10 outline-none transition-all"
          />
        </div>
      </form>

      {query && <h1 className="font-display text-2xl font-bold mb-2">Results for &ldquo;{query}&rdquo;</h1>}
      {!query && <h1 className="font-display text-2xl font-bold mb-2">All Products</h1>}
      <p className="text-sm text-gray-500 mb-6">{results.length} products found</p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex items-center gap-2 mr-4">
          <SlidersHorizontal size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Filters:</span>
        </div>
        {[
          { key: 'all', label: 'All Prices' },
          { key: 'under25', label: 'Under $25' },
          { key: '25to50', label: '$25 - $50' },
          { key: 'over50', label: '$50+' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => { setPriceFilter(f.key); setTimeout(fetchResults, 0) }}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${priceFilter === f.key ? 'bg-primary text-white' : 'bg-warm-100 text-gray-600 hover:bg-warm-200'}`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm border border-warm-border rounded-lg px-3 py-2 bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Searching...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-2">No products found</p>
          <p className="text-sm text-gray-300">Try a different search term or browse categories</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
