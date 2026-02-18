'use client'

import ProductCard from '@/components/storefront/ProductCard'
import { CATEGORIES } from '@/lib/constants'
import type { Product } from '@/types'

// Demo products — replaced with Supabase queries later
const demoProducts: Product[] = [
  { id: '1', vendor_id: 'v1', category_id: 'c1', title: 'Floral Midi Wrap Dress', slug: 'floral-midi-wrap-dress', description: '', price: 29.99, compare_at_price: 74.99, status: 'approved', inventory_count: 22, sold_count: 1200, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.8, rating_count: 128, created_at: '', updated_at: '', vendor: { id: 'v1', user_id: '', business_name: 'Luxe Thread Co.', slug: 'luxe-thread', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
  { id: '2', vendor_id: 'v2', category_id: 'c1', title: 'Linen Blend Maxi Skirt', slug: 'linen-blend-maxi-skirt', description: '', price: 24.99, compare_at_price: 52.00, status: 'approved', inventory_count: 45, sold_count: 890, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.6, rating_count: 73, created_at: '', updated_at: '', vendor: { id: 'v2', user_id: '', business_name: 'Aria Boutique', slug: 'aria-boutique', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
  { id: '3', vendor_id: 'v3', category_id: 'c1', title: 'Cropped Denim Jacket — Vintage Wash', slug: 'cropped-denim-jacket', description: '', price: 34.99, compare_at_price: 68.00, status: 'approved', inventory_count: 30, sold_count: 560, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.7, rating_count: 95, created_at: '', updated_at: '', vendor: { id: 'v3', user_id: '', business_name: 'Oak & Stone', slug: 'oak-stone', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
  { id: '4', vendor_id: 'v1', category_id: 'c1', title: 'Ribbed Knit Tank Top — Sage', slug: 'ribbed-knit-tank', description: '', price: 14.99, compare_at_price: 28.00, status: 'approved', inventory_count: 60, sold_count: 1800, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.5, rating_count: 201, created_at: '', updated_at: '', vendor: { id: 'v1', user_id: '', business_name: 'Luxe Thread Co.', slug: 'luxe-thread', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
]

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = CATEGORIES.find(c => c.slug === slug)

  return (
    <div className="page-container py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{category?.icon || '🛍️'}</span>
          <h1 className="section-title">{category?.name || 'All Products'}</h1>
        </div>
        <p className="text-sm text-gray-500">{demoProducts.length} deals available</p>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
        {['All', 'Under $25', '$25-$50', '$50+', 'Top Rated', 'New Arrivals'].map((filter) => (
          <button key={filter} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filter === 'All' ? 'bg-primary text-white' : 'bg-warm-100 text-gray-600 hover:bg-warm-200'}`}>
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {demoProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
