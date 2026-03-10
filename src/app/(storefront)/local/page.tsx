'use client'

import { useEffect, useState } from 'react'
import { MapPin, Heart, Store, Mountain, Sun, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import ProductCard from '@/components/storefront/ProductCard'
import type { Product, Vendor } from '@/types'

export default function ShopLocalPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLocal() {
      const supabase = createClient()

      // Fetch local vendors
      const { data: localVendors } = await supabase
        .from('vendors')
        .select('*')
        .eq('is_local', true)
        .eq('status', 'approved')
        .order('total_sales', { ascending: false })

      if (localVendors) setVendors(localVendors as Vendor[])

      // Fetch products from local vendors
      if (localVendors && localVendors.length > 0) {
        const vendorIds = localVendors.map(v => v.id)
        const { data: localProducts } = await supabase
          .from('products')
          .select('*, images:product_images(id, url, alt, sort_order), vendor:vendors(id, business_name, slug, is_local)')
          .in('vendor_id', vendorIds)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(12)

        if (localProducts) setProducts(localProducts as Product[])
      }

      setLoading(false)
    }
    fetchLocal()
  }, [])

  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#2D2926] via-[#3D3936] to-[#4A3F3A] text-white py-20 md:py-28 overflow-hidden">
        {/* Red rock texture overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0iI0M0OTU2QSIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+')] bg-repeat" />
        </div>

        <div className="section-padding relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm font-semibold mb-6">
              <MapPin size={16} />
              <span>Saint George, Utah</span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Shop Local.<br />
              <span className="text-accent">Support Your Neighbors.</span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto leading-relaxed">
              Vender was born in Southern Utah. Discover products from local creators and small
              businesses right here in St. George and surrounding communities.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <a href="#local-products" className="btn-primary text-base px-8 py-3">
                Browse Local Products
              </a>
              <Link href="/vendor/apply" className="bg-white/10 backdrop-blur-sm text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all">
                Join as Local Vendor
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <Mountain size={120} className="absolute bottom-0 left-8 text-white/5" />
        <Sun size={80} className="absolute top-8 right-12 text-accent/20" />
      </div>

      {/* Why Shop Local */}
      <div className="section-padding py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-4">Why Shop Local?</h2>
        <p className="text-center text-gray-500 mb-12 max-w-lg mx-auto">
          When you buy from local vendors on Vender, your money stays in the community and supports real people.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              icon: Heart,
              title: 'Support Local Families',
              desc: 'Every purchase helps a neighbor pay rent, grow their dream, and invest back into our community.',
            },
            {
              icon: MapPin,
              title: 'Free Local Pickup',
              desc: 'Many of our local vendors offer free pickup right here in St. George. Skip shipping, grab it today.',
            },
            {
              icon: Users,
              title: 'Build Community',
              desc: 'Know the people behind the products. Meet at local markets, events, and pop-ups around town.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
                <Icon size={24} className="text-emerald-600" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Local Vendors */}
      <div className="bg-warm-100 py-16 md:py-20">
        <div className="section-padding">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">Our Local Vendors</h2>
              <p className="text-gray-500 text-sm mt-1">Creators and businesses from the St. George area</p>
            </div>
            <Link href="/vendor/apply" className="btn-secondary text-sm">
              Become a Vendor
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="card p-12 text-center">
              <Store size={40} className="mx-auto text-gray-300 mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Be the first local vendor!</h3>
              <p className="text-gray-500 text-sm mb-6">We&apos;re building our local vendor community. Apply today and get featured here.</p>
              <Link href="/vendor/apply" className="btn-primary">Apply to Sell</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {vendors.map(v => (
                <Link
                  key={v.id}
                  href={`/shop/${v.slug}`}
                  className="card p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="w-16 h-16 rounded-full bg-accent-light mx-auto mb-4 flex items-center justify-center text-2xl font-display font-bold overflow-hidden">
                    {v.logo_url ? (
                      <Image src={v.logo_url} alt={v.business_name} width={64} height={64} className="object-cover w-full h-full" />
                    ) : (
                      v.business_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{v.business_name}</h3>
                  <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-medium">
                    <MapPin size={12} />
                    <span>{v.city || 'St. George'}, {v.state || 'UT'}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{v.product_count} products</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Local Products */}
      <div id="local-products" className="section-padding py-16 md:py-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              Local Products
            </h2>
            <p className="text-gray-500 text-sm mt-1">Made and sold by your neighbors</p>
          </div>
          <Link href="/search?local=true" className="text-sm font-medium text-accent-dark hover:underline">
            View All Local
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Local products coming soon! Stay tuned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {/* Founded Here Banner */}
      <div className="bg-gradient-to-r from-[#2D2926] to-[#3D3936] text-white">
        <div className="section-padding py-16 text-center">
          <p className="text-accent font-display text-sm font-semibold uppercase tracking-widest mb-3">Our Story</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            Founded in Saint George, Utah
          </h2>
          <p className="text-white/60 max-w-lg mx-auto mb-8 leading-relaxed">
            Vender was created by local founders who believe in the power of community commerce.
            We&apos;re building a marketplace that puts local creators first — starting right here in our hometown.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/about" className="btn-primary">Our Story</Link>
            <Link href="/contact" className="bg-white/10 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all">
              Get in Touch
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
