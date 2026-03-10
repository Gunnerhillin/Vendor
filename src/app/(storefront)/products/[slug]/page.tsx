'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Star, ShoppingBag, Heart, Minus, Plus, ChevronRight, Truck, Shield, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/use-cart'
import { formatPrice, calculateDiscount, formatDate } from '@/lib/utils'
import ProductCard from '@/components/storefront/ProductCard'
import ShareButtons from '@/components/storefront/ShareButtons'
import RecentlyViewed, { addToRecentlyViewed } from '@/components/storefront/RecentlyViewed'
import { useToast } from '@/components/shared/Toast'
import { ProductDetailSkeleton } from '@/components/shared/Skeleton'
import type { Product, ProductVariant, Review } from '@/types'

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params?.slug as string
  const supabase = createClient()
  const addItem = useCart((s) => s.addItem)
  const toggleCart = useCart((s) => s.toggleCart)
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [reviews, setReviews] = useState<any[]>([])
  const [related, setRelated] = useState<Product[]>([])
  const [wishlisted, setWishlisted] = useState(false)

  // Review form
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true)

      // Check auth
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      // Fetch product - need to find by slug. Products have unique(vendor_id, slug) so we search
      const { data: products } = await supabase
        .from('products')
        .select(`
          *,
          vendor:vendors(id, business_name, slug, logo_url),
          category:categories(id, name, slug, icon),
          images:product_images(id, url, alt, sort_order),
          variants:product_variants(id, name, type, value, price_adjustment, inventory_count, sort_order)
        `)
        .eq('slug', slug)
        .eq('status', 'approved')
        .limit(1)

      if (products && products.length > 0) {
        const p = products[0] as any
        // Sort images and variants
        if (p.images) p.images.sort((a: any, b: any) => a.sort_order - b.sort_order)
        if (p.variants) p.variants.sort((a: any, b: any) => a.sort_order - b.sort_order)
        setProduct(p)
        addToRecentlyViewed(p.id)

        // Fetch reviews
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*, customer:profiles(full_name, avatar_url)')
          .eq('product_id', p.id)
          .order('created_at', { ascending: false })

        if (reviewsData) setReviews(reviewsData)

        // Fetch related products
        const { data: relatedData } = await supabase
          .from('products')
          .select('*, images:product_images(id, url, alt, sort_order), vendor:vendors(id, business_name, slug)')
          .eq('category_id', p.category_id)
          .eq('status', 'approved')
          .neq('id', p.id)
          .limit(4)

        if (relatedData) setRelated(relatedData as any)

        // Check wishlist
        if (user) {
          const { data: wish } = await supabase
            .from('wishlists')
            .select('id')
            .eq('customer_id', user.id)
            .eq('product_id', p.id)
            .single()
          setWishlisted(!!wish)
        }
      }
      setLoading(false)
    }
    if (slug) fetchProduct()
  }, [slug])

  const handleAddToCart = () => {
    if (!product) return
    addItem(product, selectedVariant, quantity)
    toggleCart()
    toast(`${product.title} added to bag`, 'cart')
  }

  const handleWishlist = async () => {
    if (!product) return
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id }),
    })
    const data = await res.json()
    setWishlisted(data.added)
    toast(data.added ? 'Added to wishlist' : 'Removed from wishlist', 'wishlist')
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setReviewSubmitting(true)
    setReviewError('')

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, rating: reviewRating, comment: reviewComment }),
    })

    const data = await res.json()
    if (!res.ok) {
      setReviewError(data.error)
    } else {
      setReviewSuccess(true)
      setReviewComment('')
      // Refresh reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, customer:profiles(full_name, avatar_url)')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
      if (reviewsData) setReviews(reviewsData)
    }
    setReviewSubmitting(false)
  }

  const discount = product?.compare_at_price ? calculateDiscount(product.price, product.compare_at_price) : 0
  const effectivePrice = product ? product.price + (selectedVariant?.price_adjustment || 0) : 0

  const sizeVariants = product?.variants?.filter(v => v.type === 'size') || []
  const colorVariants = product?.variants?.filter(v => v.type === 'color') || []

  if (loading) {
    return <ProductDetailSkeleton />
  }

  if (!product) {
    return (
      <div className="section-padding py-20 text-center">
        <h1 className="font-display text-2xl font-semibold mb-4">Product Not Found</h1>
        <p className="text-gray-400 mb-6">This product doesn't exist or is no longer available.</p>
        <Link href="/" className="btn-primary">Back to Home</Link>
      </div>
    )
  }

  const mainImage = product.images?.[selectedImage]?.url || ''

  return (
    <div className="section-padding py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <Link href="/" className="hover:text-accent">Home</Link>
        <ChevronRight size={14} />
        {product.category && (
          <>
            <Link href={`/category/${product.category.slug}`} className="hover:text-accent">{product.category.name}</Link>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-primary">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
        {/* Images */}
        <div>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-warm-100 mb-4">
            {mainImage ? (
              <Image src={mainImage} alt={product.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">🛍️</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-accent' : 'border-transparent hover:border-warm-300'}`}
                >
                  <Image src={img.url} alt={img.alt || ''} fill sizes="12vw" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {/* Vendor */}
          {product.vendor && (
            <Link href={`/shop/${product.vendor.slug}`} className="text-sm text-accent-dark font-medium hover:underline mb-2 inline-block">
              {product.vendor.business_name}
            </Link>
          )}

          <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">{product.title}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={16} className={s <= Math.round(product.rating_avg || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
              ))}
            </div>
            <span className="text-sm text-gray-500">({product.rating_count} reviews)</span>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm text-gray-500">{product.sold_count} sold</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold">{formatPrice(effectivePrice)}</span>
            {product.compare_at_price && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.compare_at_price)}</span>
                <span className="badge bg-red-100 text-red-700">{discount}% OFF</span>
              </>
            )}
          </div>

          {/* Size Variants */}
          {sizeVariants.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizeVariants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-accent bg-accent/10 text-accent-dark'
                        : 'border-warm-border hover:border-accent'
                    } ${v.inventory_count === 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                    disabled={v.inventory_count === 0}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Variants */}
          {colorVariants.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {colorVariants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-accent bg-accent/10 text-accent-dark'
                        : 'border-warm-border hover:border-accent'
                    }`}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <p className="text-sm font-medium">Quantity</p>
            <div className="flex items-center border border-warm-border rounded-lg overflow-hidden">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-warm-100"><Minus size={16} /></button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-warm-100"><Plus size={16} /></button>
            </div>
            <span className="text-sm text-gray-400">{product.inventory_count} available</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={handleAddToCart}
              disabled={product.inventory_count === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-base"
            >
              <ShoppingBag size={20} />
              {product.inventory_count === 0 ? 'Out of Stock' : 'Add to Bag'}
            </button>
            <button
              onClick={handleWishlist}
              className={`p-4 rounded-lg border-2 transition-all ${wishlisted ? 'border-red-300 bg-red-50 text-red-500' : 'border-warm-border hover:border-accent'}`}
            >
              <Heart size={20} className={wishlisted ? 'fill-red-500' : ''} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-warm-100 rounded-xl">
            <div className="text-center">
              <Truck size={20} className="mx-auto text-accent mb-1" />
              <p className="text-[11px] font-medium text-gray-600">Tracked Shipping</p>
            </div>
            <div className="text-center">
              <Shield size={20} className="mx-auto text-accent mb-1" />
              <p className="text-[11px] font-medium text-gray-600">Secure Payment</p>
            </div>
            <div className="text-center">
              <RotateCcw size={20} className="mx-auto text-accent mb-1" />
              <p className="text-[11px] font-medium text-gray-600">Easy Returns</p>
            </div>
          </div>

          {/* Share */}
          <div className="mt-6 pt-6 border-t border-warm-border">
            <ShareButtons
              url={typeof window !== 'undefined' ? window.location.href : `https://vendor-uiu3.vercel.app/products/${slug}`}
              title={product.title}
              description={product.description?.slice(0, 150)}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-16">
        <h2 className="font-display text-xl font-bold mb-4">Product Description</h2>
        <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">{product.description}</div>
      </div>

      {/* Reviews */}
      <div className="mb-16">
        <h2 className="font-display text-xl font-bold mb-6">Customer Reviews ({reviews.length})</h2>

        {/* Review Form */}
        {isLoggedIn && !reviewSuccess && (
          <form onSubmit={handleReviewSubmit} className="card p-6 mb-8">
            <h3 className="font-semibold mb-4">Write a Review</h3>
            {reviewError && <p className="text-sm text-red-600 mb-3">{reviewError}</p>}
            <div className="flex items-center gap-1 mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button" onClick={() => setReviewRating(s)}>
                  <Star size={24} className={s <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience with this product..."
              className="input mb-4 min-h-[100px]"
            />
            <button type="submit" disabled={reviewSubmitting} className="btn-primary">
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
        {reviewSuccess && (
          <div className="card p-6 mb-8 bg-green-50 text-green-700 text-sm">Thanks for your review!</div>
        )}

        {/* Review List */}
        {reviews.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No reviews yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center text-xs font-bold">
                    {(r.customer?.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.customer?.full_name || 'Anonymous'}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                  </div>
                  <div className="flex items-center ml-auto">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} className={s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mb-16">
          <h2 className="font-display text-xl font-bold mb-6">You Might Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      <RecentlyViewed excludeId={product.id} />
    </div>
  )
}
