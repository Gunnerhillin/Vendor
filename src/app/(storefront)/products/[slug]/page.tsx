'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Minus, Plus, Check, Truck, RefreshCw, Shield, Star } from 'lucide-react'
import { formatPrice, calculateDiscount } from '@/lib/utils'
import { useCart } from '@/hooks/use-cart'
import ProductCard from '@/components/storefront/ProductCard'

// Demo data — will be replaced with Supabase query
const product = {
  id: '1', vendor_id: 'v1', category_id: 'c1',
  title: 'Floral Midi Wrap Dress — Summer Collection',
  slug: 'floral-midi-wrap-dress',
  description: 'A beautiful floral midi wrap dress perfect for summer. Made from lightweight, breathable fabric with a flattering wrap silhouette. Features adjustable tie waist, flutter sleeves, and a midi length that hits just below the knee.',
  price: 29.99, compare_at_price: 74.99,
  status: 'approved' as const, inventory_count: 22, sold_count: 1200,
  is_preorder: false, drop_date: null,
  images: [
    { id: 'i1', product_id: '1', url: '', alt: 'Front view', sort_order: 0 },
    { id: 'i2', product_id: '1', url: '', alt: 'Side view', sort_order: 1 },
    { id: 'i3', product_id: '1', url: '', alt: 'Detail', sort_order: 2 },
    { id: 'i4', product_id: '1', url: '', alt: 'Flat lay', sort_order: 3 },
  ],
  variants: [
    { id: 'vs1', product_id: '1', name: 'XS', type: 'size' as const, value: 'XS', price_adjustment: 0, inventory_count: 5, sort_order: 0 },
    { id: 'vs2', product_id: '1', name: 'S', type: 'size' as const, value: 'S', price_adjustment: 0, inventory_count: 8, sort_order: 1 },
    { id: 'vs3', product_id: '1', name: 'M', type: 'size' as const, value: 'M', price_adjustment: 0, inventory_count: 4, sort_order: 2 },
    { id: 'vs4', product_id: '1', name: 'L', type: 'size' as const, value: 'L', price_adjustment: 0, inventory_count: 3, sort_order: 3 },
    { id: 'vs5', product_id: '1', name: 'XL', type: 'size' as const, value: 'XL', price_adjustment: 0, inventory_count: 2, sort_order: 4 },
    { id: 'vc1', product_id: '1', name: 'Sand', type: 'color' as const, value: '#E8D5C0', price_adjustment: 0, inventory_count: 10, sort_order: 0 },
    { id: 'vc2', product_id: '1', name: 'Forest', type: 'color' as const, value: '#4A7C59', price_adjustment: 0, inventory_count: 6, sort_order: 1 },
    { id: 'vc3', product_id: '1', name: 'Plum', type: 'color' as const, value: '#8B4A6B', price_adjustment: 0, inventory_count: 4, sort_order: 2 },
    { id: 'vc4', product_id: '1', name: 'Black', type: 'color' as const, value: '#2D2926', price_adjustment: 0, inventory_count: 2, sort_order: 3 },
  ],
  rating_avg: 4.8, rating_count: 128,
  created_at: '', updated_at: '',
  vendor: { id: 'v1', user_id: '', business_name: 'Luxe Thread Co.', slug: 'luxe-thread', description: null, logo_url: null, banner_url: null, status: 'approved' as const, commission_rate: 0.15, stripe_account_id: null, stripe_onboarding_complete: false, applied_at: '', approved_at: null, total_sales: 0, total_revenue: 0, product_count: 0 },
}

const sizeVariants = product.variants.filter(v => v.type === 'size')
const colorVariants = product.variants.filter(v => v.type === 'color')
const discount = calculateDiscount(product.price, product.compare_at_price || 0)
const inventoryPercent = Math.round((product.inventory_count / (product.inventory_count + product.sold_count)) * 100)

export default function ProductDetailPage() {
  const [selectedSize, setSelectedSize] = useState(sizeVariants[1]?.id || '')
  const [selectedColor, setSelectedColor] = useState(colorVariants[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const addItem = useCart((s) => s.addItem)

  const imageEmojis = ['👗', '📐', '🏷️', '📦']

  const handleAddToCart = () => {
    const variant = product.variants.find(v => v.id === selectedSize) || null
    addItem(product, variant, quantity)
  }

  return (
    <div>
      <div className="page-container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          {/* Gallery */}
          <div className="grid grid-cols-[72px_1fr] gap-4">
            <div className="flex flex-col gap-3">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-[72px] h-[72px] rounded-lg bg-warm-100 flex items-center justify-center text-2xl border-2 transition-colors ${activeImage === i ? 'border-accent' : 'border-transparent hover:border-warm-border'}`}
                >
                  {imageEmojis[i]}
                </button>
              ))}
            </div>
            <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-warm-100 to-accent-light flex items-center justify-center text-[120px]">
              {imageEmojis[activeImage]}
            </div>
          </div>

          {/* Info */}
          <div>
            <Link href={`/shop/${product.vendor?.slug}`} className="text-sm font-semibold text-accent-dark hover:underline">
              {product.vendor?.business_name}
            </Link>
            <h1 className="font-display text-2xl md:text-3xl font-semibold mt-2 mb-3 leading-tight">{product.title}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 text-sm mb-4">
              <span className="text-amber-400 flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(product.rating_avg) ? '#F59E0B' : 'none'} />
                ))}
              </span>
              <span className="text-gray-500">{product.rating_avg} ({product.rating_count} reviews)</span>
              <span className="text-gray-300">|</span>
              <span className="text-green-600 font-semibold">{product.sold_count > 1000 ? `${(product.sold_count/1000).toFixed(1)}k` : product.sold_count} sold</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
              {product.compare_at_price && (
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.compare_at_price)}</span>
              )}
              {discount > 0 && (
                <span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">Save {discount}%</span>
              )}
            </div>

            <div className="h-px bg-warm-border my-6" />

            {/* Color */}
            {colorVariants.length > 0 && (
              <div className="mb-6">
                <label className="label">Color</label>
                <div className="flex gap-3">
                  {colorVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedColor(v.id)}
                      className={`w-9 h-9 rounded-full transition-all ${selectedColor === v.id ? 'ring-2 ring-primary ring-offset-2' : 'hover:scale-110'}`}
                      style={{ backgroundColor: v.value }}
                      title={v.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size */}
            {sizeVariants.length > 0 && (
              <div className="mb-6">
                <label className="label">Size</label>
                <div className="flex flex-wrap gap-2">
                  {sizeVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedSize(v.id)}
                      className={`px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${selectedSize === v.id ? 'border-primary bg-primary text-white' : 'border-warm-border hover:border-accent'}`}
                    >
                      {v.value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scarcity */}
            <div className="mb-6">
              <div className="h-1.5 bg-warm-border rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-red-400 rounded-full" style={{ width: `${inventoryPercent}%` }} />
              </div>
              <p className="text-xs font-semibold text-red-500 mt-1.5">Hurry — only {inventoryPercent}% of stock remaining!</p>
            </div>

            {/* Add to Cart */}
            <div className="flex gap-3">
              <div className="flex items-center border-2 border-warm-border rounded-lg overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-11 h-12 flex items-center justify-center hover:bg-warm-100 transition-colors">
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(10, quantity + 1))} className="w-11 h-12 flex items-center justify-center hover:bg-warm-100 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              <button onClick={handleAddToCart} className="btn-primary flex-1 text-base">
                Add to Bag
              </button>
              <button className="w-12 h-12 border-2 border-warm-border rounded-lg flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors">
                <Heart size={20} />
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 mt-8">
              {[
                { icon: Truck, text: 'Free shipping over $50' },
                { icon: RefreshCw, text: 'Easy returns & refunds' },
                { icon: Shield, text: 'Secure checkout' },
                { icon: Check, text: 'Ships in 2-4 business days' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-xs text-gray-500">
                  <Icon size={14} className="text-green-600" />
                  {text}
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="mt-8 pt-8 border-t border-warm-border">
              <h3 className="font-semibold mb-3">Description</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
