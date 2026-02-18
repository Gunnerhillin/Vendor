import { Search } from 'lucide-react'
import ProductCard from '@/components/storefront/ProductCard'
import type { Product } from '@/types'

const demoProducts: Product[] = [
  { id: '1', vendor_id: 'v1', category_id: 'c1', title: 'Floral Midi Wrap Dress', slug: 'floral-midi-wrap-dress', description: '', price: 29.99, compare_at_price: 74.99, status: 'approved', inventory_count: 22, sold_count: 1200, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.8, rating_count: 128, created_at: '', updated_at: '', vendor: { id: 'v1', user_id: '', business_name: 'Luxe Thread Co.', slug: 'luxe-thread', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
  { id: '2', vendor_id: 'v2', category_id: 'c7', title: 'Vitamin C Brightening Serum', slug: 'vitamin-c-serum', description: '', price: 18.50, compare_at_price: 42.00, status: 'approved', inventory_count: 120, sold_count: 800, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.3, rating_count: 87, created_at: '', updated_at: '', vendor: { id: 'v2', user_id: '', business_name: 'Glow Naturals', slug: 'glow-naturals', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
]

export default function SearchPage() {
  return (
    <div className="page-container py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <Search size={24} className="text-gray-400" />
        <h1 className="section-title">Search Results</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">{demoProducts.length} results found</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {demoProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
