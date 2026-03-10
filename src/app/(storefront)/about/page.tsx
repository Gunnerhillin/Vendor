import { Heart, ShieldCheck, Users, MapPin, Mountain, Sun } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'About Vender | Founded in Saint George, Utah',
  description: 'Vender is a curated marketplace founded in Saint George, Utah — empowering local and independent brands to reach more customers.',
}

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-warm-100 via-warm-200 to-accent-light py-16 md:py-24">
        <div className="section-padding text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-6">
            <MapPin size={14} />
            <span>Founded in Saint George, Utah</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Built by Locals,<br />for Everyone
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Vender is a curated marketplace connecting shoppers with exceptional products from
            independent creators and small businesses. Born in Southern Utah, built for the world.
          </p>
        </div>
      </div>

      {/* Our Story */}
      <div className="section-padding py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold text-accent-dark uppercase tracking-widest mb-3">Our Story</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-5">
                From Saint George to everywhere
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Vender was founded in Saint George, Utah by local entrepreneurs who saw a gap in the marketplace.
                Too many talented creators in our community were struggling to reach customers online.
                Big marketplaces bury small sellers under algorithms, and building a standalone store takes
                time most small businesses don&apos;t have.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                We started by connecting local St. George vendors with local shoppers, and we&apos;re growing
                from there. Our platform gives independent brands a beautiful storefront, built-in audience,
                and simple tools to manage their business — so they can focus on what they do best: making
                great products.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Whether you&apos;re shopping from right here in Southern Utah or from across the country,
                every purchase on Vender supports a real person building something they believe in.
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#2D2926] to-[#3D3936] rounded-2xl p-12 flex items-center justify-center min-h-[300px] relative overflow-hidden">
              <Mountain size={120} className="absolute bottom-4 left-4 text-white/5" />
              <Sun size={60} className="absolute top-6 right-6 text-accent/20" />
              <div className="text-center relative">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm font-semibold mb-4">
                  <MapPin size={16} />
                  <span>St. George, UT</span>
                </div>
                <p className="text-white font-display text-xl font-bold mb-2">Red Rock Roots</p>
                <p className="text-white/50 text-sm">Where the desert meets entrepreneurship</p>
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
                desc: 'We started in our local community and we build with community in mind — listening to vendors and shoppers to make decisions that benefit everyone.',
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

      {/* Local First */}
      <div className="section-padding py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Local Pickup</h4>
                    <p className="text-xs text-gray-500">Skip shipping — pick up from local vendors in St. George</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Users size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Meet the Makers</h4>
                    <p className="text-xs text-gray-500">Know the people behind every product you buy</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Heart size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Money Stays Local</h4>
                    <p className="text-xs text-gray-500">Your purchases support local families and businesses</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">Local First</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-5">
                Proud to be from Southern Utah
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We believe the best way to build a great marketplace is to start local. Saint George has an
                incredible community of artists, makers, and entrepreneurs — and we want to help them reach
                more customers.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Local vendors get a special &ldquo;Shop Local&rdquo; badge, can offer free local pickup, and are
                featured on our dedicated local marketplace page.
              </p>
              <Link href="/local" className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:underline">
                <MapPin size={16} /> Shop Local Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-[#2D2926] to-[#3D3936] text-white">
        <div className="section-padding py-16 md:py-20 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Ready to join?</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">Whether you&apos;re a shopper looking for unique finds or a local brand ready to grow, we&apos;d love to have you.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/search" className="btn-primary">Start Shopping</Link>
            <Link href="/local" className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-6 py-3 rounded-xl font-semibold hover:bg-emerald-500/30 transition-all">
              Shop Local
            </Link>
            <Link href="/vendor/apply" className="bg-white/10 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all">
              Sell on Vender
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
