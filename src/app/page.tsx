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
import { ArrowRight, ShieldCheck, Truck, RefreshCw, Heart, Star, TrendingUp, Sparkles } from 'lucide-react'
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

/* ── Placeholder products shown when the DB is empty ── */
/* ADMIN REMINDER: Replace these with real product data once vendors are onboarded */
const PLACEHOLDER_PRODUCTS = [
  { id: 'ph-1', title: 'Handcrafted Ceramic Vase', price: 42, compare_price: 58, slug: 'handcrafted-ceramic-vase', images: [], vendor: { business_name: 'Coming Soon', slug: '#' }, status: 'approved' },
  { id: 'ph-2', title: 'Organic Cotton Tote Bag', price: 24, compare_price: 35, slug: 'organic-cotton-tote', images: [], vendor: { business_name: 'Coming Soon', slug: '#' }, status: 'approved' },
  { id: 'ph-3', title: 'Artisan Soy Candle Set', price: 36, compare_price: 48, slug: 'artisan-soy-candle-set', images: [], vendor: { business_name: 'Coming Soon', slug: '#' }, status: 'approved' },
  { id: 'ph-4', title: 'Minimalist Gold Necklace', price: 54, compare_price: 72, slug: 'minimalist-gold-necklace', images: [], vendor: { business_name: 'Coming Soon', slug: '#' }, status: 'approved' },
]

/* ── Placeholder featured vendor shown when none exist ── */
/* ADMIN REMINDER: Replace with real featured vendor once vendors are approved */
const PLACEHOLDER_VENDOR = {
  slug: '#',
  business_name: 'Your Brand Here',
  description: 'This spotlight is waiting for its first featured vendor. Once vendors are approved, the top-performing brand will appear here with their story and products.',
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

  const showTrending = trending.length > 0 ? trending : PLACEHOLDER_PRODUCTS
  const showNewArrivals = newArrivals.length > 0 ? newArrivals : PLACEHOLDER_PRODUCTS
  const isPlaceholder = trending.length === 0 && !loading

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

        {/* ── Trust Bar ── */}
        <RevealSection>
          <div className="bg-white border-b border-warm-border">
            <div className="section-padding py-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Secure Checkout</p>
                    <p className="text-[11px] text-gray-400">SSL encrypted payments</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Free Shipping</p>
                    <p className="text-[11px] text-gray-400">On orders over $50</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Easy Returns</p>
                    <p className="text-[11px] text-gray-400">30-day return policy</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent-dark flex-shrink-0">
                    <Heart size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Support Indie</p>
                    <p className="text-[11px] text-gray-400">25% back to creators</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

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
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-accent" />
                <h2 className="text-2xl font-display font-bold text-primary">Trending Now</h2>
              </div>
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
          ) : (
            <RevealSection>
              {isPlaceholder && (
                <div className="mb-4 flex items-center gap-2 text-xs text-accent-dark bg-accent/5 rounded-full px-4 py-2 w-fit mx-auto">
                  <Sparkles size={14} />
                  <span>Preview — real products appear once vendors are onboarded</span>
                </div>
              )}
              <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 ${isPlaceholder ? 'opacity-75' : ''}`}>
                {showTrending.map((p: any) => (
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
              <div className="flex items-center gap-2">
                <Star size={20} className="text-accent" />
                <h2 className="text-2xl font-display font-bold text-primary">Vendor Spotlight</h2>
              </div>
            </div>
          </RevealSection>
          <RevealSection>
            <VendorSpotlight vendor={trending.length > 0 ? undefined : PLACEHOLDER_VENDOR} />
          </RevealSection>
        </section>

        {/* New Arrivals */}
        <section className="section-padding pb-12 md:pb-16">
          <RevealSection>
            <div className="flex items-baseline justify-between mb-8">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-accent" />
                <h2 className="text-2xl font-display font-bold text-primary">New Arrivals</h2>
              </div>
              <Link href="/search?sort=newest" className="text-sm font-semibold text-accent-dark hover:text-accent transition-colors flex items-center gap-1 group">
                See All
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </RevealSection>
          <RevealSection>
            {isPlaceholder && (
              <div className="mb-4 flex items-center gap-2 text-xs text-accent-dark bg-accent/5 rounded-full px-4 py-2 w-fit mx-auto">
                <Sparkles size={14} />
                <span>Preview — real products appear once vendors are onboarded</span>
              </div>
            )}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 ${isPlaceholder ? 'opacity-75' : ''}`}>
              {showNewArrivals.slice(0, 4).map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </RevealSection>
        </section>

        {/* How It Works */}
        <section className="bg-warm-100 py-16 md:py-20">
          <div className="section-padding">
            <RevealSection>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-primary text-center mb-12">
                How Vender Works
              </h2>
            </RevealSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto">
              <RevealSection delay="delay-100">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-soft flex items-center justify-center mx-auto mb-5">
                    <span className="text-3xl">1</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">Browse Curated Deals</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Discover unique products from independent brands, all vetted for quality.</p>
                </div>
              </RevealSection>
              <RevealSection delay="delay-200">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-soft flex items-center justify-center mx-auto mb-5">
                    <span className="text-3xl">2</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">Shop with Confidence</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Secure checkout, free shipping over $50, and easy 30-day returns.</p>
                </div>
              </RevealSection>
              <RevealSection delay="delay-300">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-soft flex items-center justify-center mx-auto mb-5">
                    <span className="text-3xl">3</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">Support Indie Brands</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Every purchase directly supports small business owners and creators.</p>
                </div>
              </RevealSection>
            </div>
          </div>
        </section>

        {/* Vendor CTA */}
        <section className="section-padding py-16 md:py-20">
          <RevealSection>
            <VendorCTA />
          </RevealSection>
        </section>
      </main>
      <Footer />
    </>
  )
}
