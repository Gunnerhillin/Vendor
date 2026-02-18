import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-primary text-white/70 mt-20">
      <div className="page-container py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-display text-2xl font-bold text-white mb-4 block">
              V<span className="text-accent">ender</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Curated deals from independent brands. New drops every day at prices you&apos;ll love.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Shop</h4>
            <nav className="space-y-2">
              <Link href="/" className="block text-sm hover:text-accent-light transition-colors">Today&apos;s Deals</Link>
              <Link href="/search?sort=newest" className="block text-sm hover:text-accent-light transition-colors">New Arrivals</Link>
              <Link href="/search?sort=popular" className="block text-sm hover:text-accent-light transition-colors">Best Sellers</Link>
              <Link href="/category/clothing" className="block text-sm hover:text-accent-light transition-colors">Categories</Link>
            </nav>
          </div>

          {/* Sell */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Sell</h4>
            <nav className="space-y-2">
              <Link href="/vendor/apply" className="block text-sm hover:text-accent-light transition-colors">Apply to Sell</Link>
              <Link href="#" className="block text-sm hover:text-accent-light transition-colors">Vendor Resources</Link>
              <Link href="#" className="block text-sm hover:text-accent-light transition-colors">Success Stories</Link>
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Company</h4>
            <nav className="space-y-2">
              <Link href="#" className="block text-sm hover:text-accent-light transition-colors">About</Link>
              <Link href="#" className="block text-sm hover:text-accent-light transition-colors">Contact</Link>
              <Link href="#" className="block text-sm hover:text-accent-light transition-colors">Privacy Policy</Link>
              <Link href="#" className="block text-sm hover:text-accent-light transition-colors">Terms of Service</Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <span>&copy; {new Date().getFullYear()} Vender. All rights reserved.</span>
          <span>Made with care for independent brands.</span>
        </div>
      </div>
    </footer>
  )
}
