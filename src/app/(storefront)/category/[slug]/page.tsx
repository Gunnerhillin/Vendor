'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProductCard from '@/components/storefront/ProductCard'
import { CATEGORIES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types'

export default function CategoryPage() {
  const params = useParams()
  const slug = params?.slug as string
  const category = CATEGORIES.find(c => c.slug === slug)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const [priceFilter, setPriceFilter] = useState('all')

  useEffect(() => {
    fetchProducts()
  }, [slug, sort])

  async function fetchProducts() {
    setLoading(true)
    const supabase = createClient()

    // First get category ID
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!cat) { setLoading(false); return }

    let q = supabase
      .from('products')
      .select('*, images:product_images(id, url, alt, sort_order), vendor:vendors(id, business_name, slug)')
      .eq('category_id', cat.id)
      .eq('status', 'approved')

    switch (sort) {
      case 'price_asc': q = q.order('price', { ascending: true }); break
      case 'price_desc': q = q.order('price', { ascending: false }); break
      case 'popular': q = q.order('sold_count', { ascending: false }); break
      case 'rating': q = q.order('rating_avg', { ascending: false }); break
      default: q = q.order('created_at', { ascending: false })
    }

    const { data } = await q.limit(48)
    let results = (data || []) as Product[]

    if (priceFilter === 'under25') results = results.filter(p => p.price < 25)
    else if (priceFilter === '25to50') results = results.filter(p => p.price >= 25 && p.price <= 50)
    else if (priceFilter === 'over50') results = results.filter(p => p.price > 50)

    setProducts(results)
    setLoading(false)
  }

  return (
    <div className="section-padding py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{category?.icon || '🛍️'}</span>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary">{category?.name || 'All Products'}</h1>
        </div>
        <p className="text-sm text-gray-500">{products.length} deals available</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {[
          { key: 'all', label: 'All' },
          { key: 'under25', label: 'Under $25' },
          { key: '25to50', label: '$25-$50' },
          { key: 'over50', label: '$50+' },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => { setPriceFilter(filter.key); setTimeout(fetchProducts, 0) }}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${priceFilter === filter.key ? 'bg-primary text-white' : 'bg-warm-100 text-gray-600 hover:bg-warm-200'}`}
          >
            {filter.label}
          </button>
        ))}
        <div className="ml-auto">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-warm-border rounded-lg px-3 py-2 bg-white">
            <option value="newest">Newest</option>
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
        </div>
      ) : products.length === 0 ? (
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
