'use client'

import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import CartDrawer from '@/components/shared/CartDrawer'
import DealTimer from '@/components/storefront/DealTimer'
import CategoryGrid from '@/components/storefront/CategoryGrid'
import ProductCard from '@/components/storefront/ProductCard'
import VendorSpotlight from '@/components/storefront/VendorSpotlight'
import VendorCTA from '@/components/storefront/VendorCTA'
import Link from 'next/link'
import type { Product } from '@/types'

// Demo products for initial build — will be replaced with Supabase queries
const demoProducts: Product[] = [
  {
    id: '1', vendor_id: 'v1', category_id: 'c1', title: 'Floral Midi Wrap Dress — Summer Collection',
    slug: 'floral-midi-wrap-dress', description: '', price: 29.99, compare_at_price: 74.99,
    status: 'approved', inventory_count: 22, sold_count: 1200, is_preorder: false, drop_date: null,
    images: [], variants: [], rating_avg: 4.8, rating_count: 128, created_at: '', updated_at: '',
    vendor: { id: 'v1', user_id: '', business_name: 'Luxe Thread Co.', slug: 'luxe-thread', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 },
  },
  {
    id: '2', vendor_id: 'v2', category_id: 'c7', title: 'Vitamin C Brightening Serum — 1oz',
    slug: 'vitamin-c-serum', description: '', price: 18.50, compare_at_price: 42.00,
    status: 'approved', inventory_count: 120, sold_count: 800, is_preorder: false, drop_date: null,
    images: [], variants: [], rating_avg: 4.3, rating_count: 87, created_at: '', updated_at: '',
    vendor: { id: 'v2', user_id: '', business_name: 'Glow Naturals', slug: 'glow-naturals', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 },
  },
  {
    id: '3', vendor_id: 'v3', category_id: 'c3', title: 'Hand-Poured Soy Candle Set — Cozy Collection (3-Pack)',
    slug: 'soy-candle-set', description: '', price: 24.99, compare_at_price: 54.00,
    status: 'approved', inventory_count: 35, sold_count: 600, is_preorder: false, drop_date: null,
    images: [], variants: [], rating_avg: 4.9, rating_count: 215, created_at: '', updated_at: '',
    vendor: { id: 'v3', user_id: '', business_name: 'Haven Home', slug: 'haven-home', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 },
  },
  {
    id: '4', vendor_id: 'v4', category_id: 'c6', title: "Men's Premium Henley — Relaxed Fit",
    slug: 'mens-premium-henley', description: '', price: 22.00, compare_at_price: 48.00,
    status: 'approved', inventory_count: 80, sold_count: 320, is_preorder: true, drop_date: '2026-03-15',
    images: [], variants: [], rating_avg: 4.7, rating_count: 64, created_at: '', updated_at: '',
    vendor: { id: 'v4', user_id: '', business_name: 'Oak & Stone Apparel', slug: 'oak-stone', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 },
  },
  {
    id: '5', vendor_id: 'v5', category_id: 'c4', title: 'Crossbody Leather Bag — Saddle Tan',
    slug: 'crossbody-leather-bag', description: '', price: 34.99, compare_at_price: 64.00,
    status: 'approved', inventory_count: 55, sold_count: 410, is_preorder: false, drop_date: null,
    images: [], variants: [], rating_avg: 4.8, rating_count: 91, created_at: '', updated_at: '',
    vendor: { id: 'v5', user_id: '', business_name: 'Aria Boutique', slug: 'aria-boutique', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 },
  },
  {
    id: '6', vendor_id: 'v6', category_id: 'c2', title: 'Organic Cotton Romper Set — Sage',
    slug: 'organic-cotton-romper', description: '', price: 19.99, compare_at_price: 38.00,
    status: 'approved', inventory_count: 90, sold_count: 2100, is_preorder: false, drop_date: null,
    images: [], variants: [], rating_avg: 4.9, rating_count: 156, created_at: '', updated_at: '',
    vendor: { id: 'v6', user_id: '', business_name: 'Little Bloom Kids', slug: 'little-bloom', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 },
  },
  {
    id: '7', vendor_id: 'v2', category_id: 'c7', title: 'Clean Beauty Bundle — 5 Piece Starter Kit',
    slug: 'clean-beauty-bundle', description: '', price: 39.99, compare_at_price: 89.00,
    status: 'approved', inventory_count: 18, sold_count: 300, is_preorder: false, drop_date: null,
    images: [], variants: [], rating_avg: 4.2, rating_count: 73, created_at: '', updated_at: '',
    vendor: { id: 'v2', user_id: '', business_name: 'Glow Naturals', slug: 'glow-naturals', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 },
  },
  {
    id: '8', vendor_id: 'v7', category_id: 'c5', title: 'Resistance Band Set + Yoga Mat Bundle',
    slug: 'resistance-band-yoga-mat', description: '', price: 27.50, compare_at_price: 55.00,
    status: 'approved', inventory_count: 65, sold_count: 580, is_preorder: false, drop_date: null,
    images: [], variants: [], rating_avg: 4.9, rating_count: 202, created_at: '', updated_at: '',
    vendor: { id: 'v7', user_id: '', business_name: 'Zenith Wellness', slug: 'zenith-wellness', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 },
  },
]

export default function HomePage() {
  const trending = demoProducts.slice(0, 4)
  const moreDeals = demoProducts.slice(4)

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

        {/* Deal Timer */}
        <DealTimer />

        {/* Categories */}
        <section className="section-padding py-12 md:py-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-primary">Shop by Category</h2>
            <Link href="/search" className="text-sm font-semibold text-accent-dark hover:underline">
              View All &rarr;
            </Link>
          </div>
          <CategoryGrid />
        </section>

        {/* Trending */}
        <section className="section-padding pb-12 md:pb-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-primary">Trending Now</h2>
            <Link href="/search?sort=popular" className="text-sm font-semibold text-accent-dark hover:underline">
              See All &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Vendor Spotlight */}
        <section className="section-padding pb-12 md:pb-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-primary">Vendor Spotlight</h2>
          </div>
          <VendorSpotlight />
        </section>

        {/* More Deals */}
        <section className="section-padding pb-12 md:pb-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-primary">More Deals Ending Soon</h2>
            <Link href="/search" className="text-sm font-semibold text-accent-dark hover:underline">
              See All &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {moreDeals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
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
