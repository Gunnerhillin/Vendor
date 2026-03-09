'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import CartDrawer from '@/components/shared/CartDrawer'
import DealTimer from '@/components/storefront/DealTimer'
import CategoryGrid from '@/components/storefront/CategoryGrid'
import ProductCard from '@/components/storefront/ProductCard'
import VendorSpotlight from '@/components/storefront/VendorSpotlight'
import VendorCTA from '@/components/storefront/VendorCTA'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types'

export default function HomePage() {
  const [trending, setTrending] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProducts() {
      const supabase = createClient()

      // Trending (most sold)
      const { data: trendingData } = await supabase
        .from('products')
        .select('*, images:product_images(id, url, alt, sort_order), vendor:vendors(id, business_name, slug)')
        .eq('status', 'approved')
        .order('sold_count', { ascending: false })
        .limit(4)

      if (trendingData) setTrending(trendingData as any)

      // New arrivals
      const { data: newData } = await supabase
        .from('products')
        .select('*, images:product_images(id, url, alt, sort_order), vendor:vendors(id, business_name, slug)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(8)

      if (newData) setNewArrivals(newData as any)
      setLoading(false)
    }
    fetchProducts()
  }, [])

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen">
        {/* Hero */}
        <div className="bg-gradient-to-br from-warm-100 via-warm-200 to-accent-light relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />
          <div className="section-padding py-16 md:py-20 text-center relative">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              Discover Deals You&apos;ll Love
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
              Curated finds from independent brands at prices you won&apos;t believe. New drops daily.
            </p>
            <Link href="/search" className="btn-primary text-base">
              Shop Today&apos;s Deals &rarr;
            </Link>
          </div>
        </div>

        <DealTimer />

        {/* Categories */}
        <section className="section-padding py-12 md:py-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-primary">Shop by Category</h2>
            <Link href="/search" className="text-sm font-semibold text-accent-dark hover:underline">View All &rarr;</Link>
          </div>
          <CategoryGrid />
        </section>

        {/* Trending */}
        <section className="section-padding pb-12 md:pb-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-primary">Trending Now</h2>
            <Link href="/search?sort=popular" className="text-sm font-semibold text-accent-dark hover:underline">See All &rarr;</Link>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : trending.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No deals available yet — check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {trending.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* Vendor Spotlight */}
        <section className="section-padding pb-12 md:pb-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-primary">Vendor Spotlight</h2>
          </div>
          <VendorSpotlight />
        </section>

        {/* New Arrivals */}
        <section className="section-padding pb-12 md:pb-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-primary">New Arrivals</h2>
            <Link href="/search?sort=newest" className="text-sm font-semibold text-accent-dark hover:underline">See All &rarr;</Link>
          </div>
          {newArrivals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No new arrivals yet — check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {newArrivals.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* Vendor CTA */}
        <section className="section-padding pb-16 md:pb-20">
          <VendorCTA />
        </section>
      </main>
      <Footer />
    </>
  )
}
