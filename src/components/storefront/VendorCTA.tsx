import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function VendorCTA() {
  return (
    <div className="relative bg-gradient-to-br from-primary to-[#3D3530] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden">
      {/* Decorative ring */}
      <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border border-white/5 animate-spin-slow" />
      <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full border border-accent/10" />

      <div className="text-center md:text-left relative">
        <h2 className="font-display text-2xl md:text-3xl text-white font-semibold mb-3">Sell on Vender</h2>
        <p className="text-white/60 text-sm max-w-lg leading-relaxed">
          Join independent brands reaching thousands of new customers every day.
          Simple onboarding, powerful tools, and a dedicated audience ready to shop.
        </p>
      </div>
      <Link
        href="/marketing/vendor-landing-page.html"
        className="group relative whitespace-nowrap text-base px-8 py-3.5 bg-accent text-white font-semibold rounded-full
                   shadow-lg hover:shadow-xl hover:-translate-y-0.5
                   transition-all duration-300 ease-out
                   flex items-center gap-2"
      >
        Apply to Sell
        <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </div>
  )
}
