'use client'

import { useEffect, useState } from 'react'
import { Heart, ShoppingBag, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

export default function WishlistPage() {
  const supabase = createClient()
  const addItem = useCart((s) => s.addItem)
  const toggleCart = useCart((s) => s.toggleCart)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWishlist() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('wishlists')
        .select(`
          id,
          product:products(
            id, title, slug, price, compare_at_price, inventory_count, status,
            images:product_images(url, alt, sort_order),
            vendor:vendors(business_name, slug)
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (data) {
        // Filter out null products and non-approved
        setItems(data.filter((w: any) => w.product && w.product.status === 'approved'))
      }
      setLoading(false)
    }
    fetchWishlist()
  }, [])

  const handleRemove = async (wishlistId: string) => {
    setItems(items.filter(i => i.id !== wishlistId))
    await supabase.from('wishlists').delete().eq('id', wishlistId)
  }

  const handleAddToCart = (product: Product) => {
    addItem(product, null, 1)
    toggleCart()
  }

  if (loading) {
    return (
      <div className="section-padding py-20 text-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="section-padding py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <Heart size={24} className="text-accent" />
        <h1 className="font-display text-2xl md:text-3xl font-bold">My Wishlist</h1>
        {items.length > 0 && (
          <span className="text-sm text-gray-400">({items.length} items)</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={48} className="mx-auto text-gray-200 mb-6" />
          <h2 className="font-display text-xl font-semibold mb-3">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-8">Save items you love by clicking the heart icon on any product.</p>
          <Link href="/search" className="btn-primary">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => {
            const product = item.product
            const images = (product.images || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
            const mainImage = images[0]?.url

            return (
              <div key={item.id} className="card overflow-hidden group">
                {/* Image */}
                <Link href={`/products/${product.slug}`} className="block aspect-square bg-warm-100 overflow-hidden relative">
                  {mainImage ? (
                    <img src={mainImage} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                  )}
                  {product.inventory_count === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">Out of Stock</span>
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="p-4">
                  {product.vendor && (
                    <Link href={`/shop/${product.vendor.slug}`} className="text-xs text-accent-dark font-medium hover:underline">
                      {product.vendor.business_name}
                    </Link>
                  )}
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-medium text-sm mt-1 mb-2 line-clamp-2 hover:text-accent-dark transition-colors">
                      {product.title}
                    </h3>
                  </Link>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-bold">{formatPrice(product.price)}</span>
                    {product.compare_at_price && (
                      <span className="text-xs text-gray-400 line-through">{formatPrice(product.compare_at_price)}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.inventory_count === 0}
                      className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <ShoppingBag size={14} />
                      {product.inventory_count === 0 ? 'Sold Out' : 'Add to Bag'}
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-2 rounded-lg border border-warm-border hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
