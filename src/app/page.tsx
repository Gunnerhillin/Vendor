'use client'

import { useEffect, useState, useRef } from 'react'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import CartDrawer from '@/components/shared/CartDrawer'
import DealTimer from '@/components/storefront/DealTimer'
import CategoryGrid from '@/components/storefront/CategoryGrid'
import ProductCard from '@/components/storefront/ProductCard'
import VendorSpotlight from '@/components/storefront/VendorSpotlight'
import VendorCTA from '@/components/storefront/VendorCTA'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types'

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function RevealSection({ children, className = '', delay = '' }: { children: React.ReactNode; className?: string; delay?: string }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${delay} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  )
}

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
          {/* Decorative spinning rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-accent/[0.07] animate-spin-slow pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-dashed border-accent/[0.05] pointer-events-none" style={{ animation: 'spin-slow 30s linear infinite reverse' }} />

          {/* Floating orbs */}
          <div className="absolute top-[-50%] right-[-20%] w-[500px] h-[500px] bg-accent/[0.08] rounded-full blur-3xl animate-pulse-soft pointer-events-none" />
          <div className="absolute bottom-[-30%] left-[-10%] w-[350px] h-[350px] bg-accent/[0.05] rounded-full blur-3xl pointer-events-none" style={{ animation: 'pulse-soft 5s ease-in-out infinite 1.5s' }} />

          <div className="section-padding py-16 md:py-24 text-center relative">
            <div className="animate-fade-in-up">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-5">
                Discover Deals You&apos;ll Love
              </h1>
            </div>
            <div className="animate-fade-in-up delay-200">
              <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8 leading-relaxed">
                Curated finds from independent brands at prices you won&apos;t believe. New drops daily.
              </p>
            </div>
            <div className="animate-fade-in-up delay-400">
              <Link href="/search" className="btn-primary text-base group">
                Shop Today&apos;s Deals
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        <DealTimer />

        {/* Categories */}
        <section className="section-padding py-12 md:py-16">
          <RevealSection>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-primary">Shop by Category</h2>
              <Link href="/search" className="text-sm font-semibold text-accent-dark hover:text-accent transition-colors flex items-center gap-1 group">
                View All
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </RevealSection>
          <RevealSection delay="delay-100">
            <CategoryGrid />
          </RevealSection>
        </section>

        {/* Trending */}
        <section className="section-padding pb-12 md:pb-16">
          <RevealSection>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-primary">Trending Now</h2>
              <Link href="/search?sort=popular" className="text-sm font-semibold text-accent-dark hover:text-accent transition-colors flex items-center gap-1 group">
                See All
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </RevealSection>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : trending.length === 0 ? (
            <RevealSection>
              <div className="text-center py-12">
                <p className="text-gray-400">No deals available yet — check back soon!</p>
              </div>
            </RevealSection>
          ) : (
            <RevealSection>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {trending.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </RevealSection>
          )}
        </section>

        {/* Vendor Spotlight */}
        <section className="section-padding pb-12 md:pb-16">
          <RevealSection>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-primary">Vendor Spotlight</h2>
            </div>
          </RevealSection>
          <RevealSection>
            <VendorSpotlight />
          </RevealSection>
        </section>

        {/* New Arrivals */}
        <section className="section-padding pb-12 md:pb-16">
          <RevealSection>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-primary">New Arrivals</h2>
              <Link href="/search?sort=newest" className="text-sm font-semibold text-accent-dark hover:text-accent transition-colors flex items-center gap-1 group">
                See All
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </RevealSection>
          {newArrivals.length === 0 ? (
            <RevealSection>
              <div className="text-center py-12">
                <p className="text-gray-400">No new arrivals yet — check back soon!</p>
              </div>
            </RevealSection>
          ) : (
            <RevealSection>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {newArrivals.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </RevealSection>
          )}
        </section>

        {/* Vendor CTA */}
        <section className="section-padding pb-16 md:pb-20">
          <RevealSection>
            <VendorCTA />
          </RevealSection>
        </section>
      </main>
      <Footer />
    </>
  )
}
