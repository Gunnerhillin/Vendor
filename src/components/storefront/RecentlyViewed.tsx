'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProductCard from '@/components/storefront/ProductCard'
import type { Product } from '@/types'

const STORAGE_KEY = 'cutievalley_recently_viewed'
const MAX_ITEMS = 8

export function addToRecentlyViewed(productId: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[]
    const filtered = stored.filter(id => id !== productId)
    filtered.unshift(productId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)))
  } catch {}
}

export function getRecentlyViewedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

export default function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    async function fetch_() {
      const ids = getRecentlyViewedIds().filter(id => id !== excludeId)
      if (ids.length === 0) return

      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('*, images:product_images(id, url, alt, sort_order), vendor:vendors(id, business_name, slug)')
        .in('id', ids.slice(0, 4))
        .eq('status', 'approved')

      if (data) {
        // Preserve order from localStorage
        const sorted = ids
          .map(id => data.find((p: any) => p.id === id))
          .filter(Boolean) as Product[]
        setProducts(sorted)
      }
    }
    fetch_()
  }, [excludeId])

  if (products.length === 0) return null

  return (
    <div className="mb-16">
      <div className="flex items-center gap-2 mb-6">
        <Clock size={20} className="text-accent" />
        <h2 className="font-display text-xl font-bold">Recently Viewed</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
