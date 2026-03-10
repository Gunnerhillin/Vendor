import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface VendorSpotlightProps {
  vendor?: {
    slug: string
    business_name: string
    description: string
  }
}

export default function VendorSpotlight({ vendor }: VendorSpotlightProps) {
  if (!vendor) {
    return (
      <div className="card p-12 text-center text-gray-400">
        <p>No featured vendors yet — check back soon!</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-2 group">
      <div className="bg-gradient-to-br from-accent-light to-[#D4B896] flex items-center justify-center text-7xl md:text-8xl min-h-[240px] md:min-h-[320px] relative overflow-hidden">
        <div className="absolute inset-0 bg-accent/5 transition-opacity duration-500 group-hover:bg-accent/10" />
        <span className="transition-transform duration-500 group-hover:scale-110">🌿</span>
      </div>
      <div className="p-8 md:p-12 flex flex-col justify-center">
        <p className="text-xs font-bold text-accent-dark uppercase tracking-widest mb-3">Featured Brand</p>
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-3">{vendor.business_name}</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">{vendor.description}</p>
        <Link href={`/shop/${vendor.slug}`} className="btn-primary w-fit group/btn">
          Shop This Brand
          <ArrowRight size={16} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
        </Link>
      </div>
    </div>
  )
}
