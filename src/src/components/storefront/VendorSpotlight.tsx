import Link from 'next/link'

interface VendorSpotlightProps {
  vendor?: {
    slug: string
    business_name: string
    description: string
  }
}

export default function VendorSpotlight({ vendor }: VendorSpotlightProps) {
  const v = vendor || {
    slug: 'haven-home-co',
    business_name: 'Haven Home Co.',
    description: 'Handmade home goods crafted with intention. Every piece tells a story — from hand-poured candles to woven textiles, each item is designed to bring warmth to your space.',
  }

  return (
    <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-2">
      <div className="bg-gradient-to-br from-accent-light to-[#D4B896] flex items-center justify-center text-7xl md:text-8xl min-h-[240px] md:min-h-[320px]">
        🌿
      </div>
      <div className="p-8 md:p-12 flex flex-col justify-center">
        <p className="text-xs font-bold text-accent-dark uppercase tracking-widest mb-3">Featured Brand</p>
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-3">{v.business_name}</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">{v.description}</p>
        <Link href={`/shop/${v.slug}`} className="btn-primary w-fit">
          Shop This Brand &rarr;
        </Link>
      </div>
    </div>
  )
}
