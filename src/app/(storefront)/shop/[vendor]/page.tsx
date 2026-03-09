'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProductCard from '@/components/storefront/ProductCard'
import { createClient } from '@/lib/supabase/client'
import type { Product, Vendor } from '@/types'

export default function VendorStorefrontPage() {
  const params = useParams()
  const vendorSlug = params?.vendor as string
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVendor() {
      const supabase = createClient()

      const { data: v } = await supabase
        .from('vendors')
        .select('*')
        .eq('slug', vendorSlug)
        .eq('status', 'approved')
        .single()

      if (v) {
        setVendor(v as Vendor)

        const { data: prods } = await supabase
          .from('products')
          .select('*, images:product_images(id, url, alt, sort_order), vendor:vendors(id, business_name, slug)')
          .eq('vendor_id', v.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })

        setProducts((prods || []) as Product[])
      }
      setLoading(false)
    }
    if (vendorSlug) fetchVendor()
  }, [vendorSlug])

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="section-padding py-16 text-center">
        <p className="text-gray-400 text-lg">Vendor not found</p>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-accent-light to-[#D4B896] py-16 text-center relative overflow-hidden">
        {vendor.banner_url && (
          <img src={vendor.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-white mx-auto mb-5 flex items-center justify-center text-3xl font-display font-bold shadow-lg overflow-hidden">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt={vendor.business_name} className="w-full h-full object-cover" />
            ) : (
              vendor.business_name.charAt(0).toUpperCase()
            )}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">{vendor.business_name}</h1>
          {vendor.description && <p className="text-gray-600 max-w-md mx-auto text-sm mb-4">{vendor.description}</p>}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>{products.length} products</span>
            <span>{vendor.total_sales} sales</span>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="section-padding py-12">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display text-xl font-bold text-primary">All Products</h2>
          <span className="text-sm text-gray-400">{products.length} items</span>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No products available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
