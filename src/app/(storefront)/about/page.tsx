{/* ADMIN REMINDER: Update this page with real company story, team photos, and founding details */}

import { Heart, ShieldCheck, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'About',
  description: 'Learn about Vender — a curated marketplace empowering independent brands.',
}

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-warm-100 via-warm-200 to-accent-light py-16 md:py-24">
        <div className="section-padding text-center max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Empowering Independent Brands
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Vender is a curated marketplace connecting shoppers with exceptional products from
            independent creators and small businesses. We believe great things come from passionate people.
          </p>
        </div>
      </div>

      {/* Mission */}
      <div className="section-padding py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold text-accent-dark uppercase tracking-widest mb-3">Our Mission</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-5">
                Making it easy to discover and support indie brands
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We started Vender because we saw too many talented creators struggling to reach customers.
                Big marketplaces bury small sellers under algorithms, and building a standalone store takes
                time most small businesses don&apos;t have.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our platform gives independent brands a beautiful storefront, built-in audience, and
                simple tools to manage their business — so they can focus on making great products.
              </p>
            </div>
            <div className="bg-gradient-to-br from-accent-light to-warm-200 rounded-2xl p-12 flex items-center justify-center min-h-[300px]">
              {/* ADMIN REMINDER: Replace with real team/founder photo */}
              <div className="text-center">
                <Sparkles size={48} className="text-accent mx-auto mb-4" />
                <p className="text-sm text-accent-dark font-medium">Your story starts here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="bg-warm-100 py-16 md:py-20">
        <div className="section-padding">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">What We Stand For</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Heart,
                title: 'Support Creators',
                desc: 'Every purchase directly supports an independent business owner. We take a fair commission and pass the rest to the people making the products.',
              },
              {
                icon: ShieldCheck,
                title: 'Quality First',
                desc: 'Every vendor is vetted before joining the platform. We curate for quality, uniqueness, and authentic craftsmanship.',
              },
              {
                icon: Users,
                title: 'Community Driven',
                desc: 'We build in public, listen to our vendors and shoppers, and make decisions that benefit the whole community.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-soft flex items-center justify-center mx-auto mb-5">
                  <Icon size={24} className="text-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="section-padding py-16 md:py-20 text-center">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Ready to join?</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">Whether you&apos;re a shopper looking for unique finds or a brand ready to grow, we&apos;d love to have you.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/search" className="btn-primary">Start Shopping</Link>
          <Link href="/marketing/vendor-landing-page.html" className="btn-secondary">Sell on Vender</Link>
        </div>
      </div>
    </div>
  )
}
