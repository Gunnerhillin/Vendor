'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Subscribed!')
        setEmail('')
        setTimeout(() => setStatus('idle'), 4000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong')
    }
  }

  return (
    <footer className="bg-primary text-white/70 mt-20">
      {/* Newsletter Banner */}
      <div className="bg-accent/10 border-b border-white/10">
        <div className="page-container py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-display text-xl font-semibold mb-1">Get the best deals in your inbox</h3>
              <p className="text-white/60 text-sm">New drops, exclusive deals, and vendor spotlights. No spam.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-accent flex-1 md:w-72 text-sm"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
              >
                {status === 'loading' ? 'Subscribing...' : status === 'success' ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
          </div>
          {status === 'error' && <p className="text-red-400 text-sm mt-2 text-center md:text-right">{message}</p>}
          {status === 'success' && <p className="text-green-400 text-sm mt-2 text-center md:text-right">{message}</p>}
        </div>
      </div>

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
              <Link href="/marketing/vendor-landing-page.html" className="block text-sm hover:text-accent-light transition-colors">Apply to Sell</Link>
              <Link href="/marketing/vendor-landing-page.html" className="block text-sm hover:text-accent-light transition-colors">Vendor Resources</Link>
              <Link href="/marketing/vendor-landing-page.html" className="block text-sm hover:text-accent-light transition-colors">Success Stories</Link>
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Company</h4>
            <nav className="space-y-2">
              <Link href="/terms" className="block text-sm hover:text-accent-light transition-colors">About</Link>
              <Link href="/terms" className="block text-sm hover:text-accent-light transition-colors">Contact</Link>
              <Link href="/privacy" className="block text-sm hover:text-accent-light transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="block text-sm hover:text-accent-light transition-colors">Terms of Service</Link>
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
