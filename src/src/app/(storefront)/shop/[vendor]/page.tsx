import ProductCard from '@/components/storefront/ProductCard'
import type { Product } from '@/types'

const vendor = {
  business_name: 'Haven Home Co.',
  slug: 'haven-home-co',
  description: 'Handmade home goods crafted with intention. Candles, textiles, and decor designed to bring warmth to your space.',
  rating: 4.9,
  totalSales: 1240,
  productCount: 48,
  yearJoined: 2024,
}

const products: Product[] = [
  { id: '1', vendor_id: 'v3', category_id: 'c3', title: 'Hand-Poured Soy Candle Set — Cozy Collection', slug: 'soy-candle-set', description: '', price: 24.99, compare_at_price: 54.00, status: 'approved', inventory_count: 35, sold_count: 600, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.9, rating_count: 215, created_at: '', updated_at: '', vendor: { id: 'v3', user_id: '', business_name: 'Haven Home Co.', slug: 'haven-home-co', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
  { id: '2', vendor_id: 'v3', category_id: 'c3', title: 'Woven Throw Blanket — Oatmeal', slug: 'woven-throw-blanket', description: '', price: 39.99, compare_at_price: 78.00, status: 'approved', inventory_count: 25, sold_count: 340, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.8, rating_count: 89, created_at: '', updated_at: '', vendor: { id: 'v3', user_id: '', business_name: 'Haven Home Co.', slug: 'haven-home-co', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
  { id: '3', vendor_id: 'v3', category_id: 'c3', title: 'Ceramic Planter Duo — Matte White', slug: 'ceramic-planter-duo', description: '', price: 18.99, compare_at_price: 36.00, status: 'approved', inventory_count: 50, sold_count: 280, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.5, rating_count: 52, created_at: '', updated_at: '', vendor: { id: 'v3', user_id: '', business_name: 'Haven Home Co.', slug: 'haven-home-co', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
  { id: '4', vendor_id: 'v3', category_id: 'c3', title: 'Minimalist Wall Art Print Set — Earth Tones', slug: 'wall-art-print-set', description: '', price: 29.99, compare_at_price: 65.00, status: 'approved', inventory_count: 15, sold_count: 420, is_preorder: false, drop_date: null, images: [], variants: [], rating_avg: 4.9, rating_count: 104, created_at: '', updated_at: '', vendor: { id: 'v3', user_id: '', business_name: 'Haven Home Co.', slug: 'haven-home-co', description: null, logo_url: null, banner_url: null, status: 'approved', commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 } },
]

export default function VendorStorefrontPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-accent-light to-[#D4B896] py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-white mx-auto mb-5 flex items-center justify-center text-3xl font-display font-bold shadow-lg">
          H
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">{vendor.business_name}</h1>
        <p className="text-gray-600 max-w-md mx-auto text-sm mb-6">{vendor.description}</p>
        <div className="flex justify-center gap-8 md:gap-12">
          {[
            { val: `${vendor.rating}★`, label: 'Rating' },
            { val: vendor.totalSales.toLocaleString(), label: 'Sales' },
            { val: vendor.productCount.toString(), label: 'Products' },
            { val: `${new Date().getFullYear() - vendor.yearJoined}yr`, label: 'On Vender' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <span className="block text-xl font-bold">{val}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="page-container py-12">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="section-title">All Products</h2>
          <span className="text-sm text-gray-500">Sort by: Best Selling</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
