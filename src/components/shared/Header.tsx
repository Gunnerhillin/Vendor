'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search, ShoppingBag, Heart, User, Menu, X, ChevronDown, LogOut, Settings, Package, Shield } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '@/hooks/use-cart'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const categories = [
  { name: "Today's Deals", href: '/' },
  { name: 'Clothing', href: '/category/clothing' },
  { name: 'Kids & Baby', href: '/category/kids-baby' },
  { name: 'Home Decor', href: '/category/home-decor' },
  { name: 'Accessories', href: '/category/accessories' },
  { name: 'Health & Wellness', href: '/category/health-wellness' },
  { name: 'Men', href: '/category/men' },
  { name: 'Beauty', href: '/category/beauty' },
  { name: 'New Arrivals', href: '/search?sort=newest' },
]

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [user, setUser] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const itemCount = useCart((s) => s.itemCount())
  const toggleCart = useCart((s) => s.toggleCart)

  useEffect(() => {
    const supabase = createClient()

    // Use onAuthStateChange for reliable session detection
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (profile) {
            setUser(profile as Profile)
            setAvatarUrl(profile.avatar_url)
          }
        } else {
          setUser(null)
          setAvatarUrl(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfileOpen(false)
    window.location.href = '/'
  }

  return (
    <>
      {/* Top Banner */}
      <div className="bg-primary text-white text-center py-2 px-4 text-xs font-medium tracking-wide">
        Free shipping on orders over $50 — <span className="text-accent">Today&apos;s deals end soon!</span>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-warm-border sticky top-0 z-50">
        <div className="section-padding flex items-center justify-between h-16 md:h-[72px]">
          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 -ml-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link href="/" className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            V<span className="text-accent">ender</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search deals, brands, and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-warm-border bg-warm-100 text-sm focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10 outline-none transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
                  }
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 md:gap-5">
            {/* Mobile search */}
            <button className="md:hidden p-2" onClick={() => setSearchOpen(!searchOpen)}>
              <Search size={22} />
            </button>

            <Link href="/vendor/apply" className="hidden lg:block text-sm font-medium hover:text-accent transition-colors">
              Sell on Vender
            </Link>

            {/* User / Profile */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={user.full_name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover border-2 border-accent"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden md:block text-sm font-medium max-w-[100px] truncate">
                    {user.full_name?.split(' ')[0] || 'Account'}
                  </span>
                  <ChevronDown size={14} className="hidden md:block text-gray-400" />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-warm-300 overflow-hidden z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-warm-300 bg-warm-100">
                      <p className="text-sm font-semibold text-primary truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/account"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-warm-100 transition-colors"
                      >
                        <User size={16} /> My Account
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-warm-100 transition-colors"
                      >
                        <Package size={16} /> My Orders
                      </Link>
                      <Link
                        href="/account/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-warm-100 transition-colors"
                      >
                        <Settings size={16} /> Settings
                      </Link>

                      {user.role === 'admin' && (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                        >
                          <Shield size={16} /> Admin Panel
                        </Link>
                      )}

                      {user.role === 'vendor' && (
                        <Link
                          href="/vendor/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <Package size={16} /> Vendor Dashboard
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-warm-300 py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="hidden md:flex items-center gap-1.5 text-sm font-medium hover:text-accent transition-colors">
                <User size={18} />
                <span>Sign In</span>
              </Link>
            )}

            <Link href="/wishlist" className="p-2 hover:text-accent transition-colors hidden md:block">
              <Heart size={22} />
            </Link>

            <button onClick={toggleCart} className="relative p-2 hover:text-accent transition-colors">
              <ShoppingBag size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search deals..."
                autoFocus
                className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-warm-border bg-warm-100 text-sm focus:border-accent outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value
                    if (val.trim()) window.location.href = `/search?q=${encodeURIComponent(val)}`
                  }
                }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Category Nav */}
      <nav className="bg-white border-b border-warm-border overflow-x-auto scrollbar-hide">
        <div className="section-padding flex items-center gap-0">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="px-4 md:px-5 py-3.5 text-[11px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b-2 border-transparent hover:text-accent-dark hover:border-accent transition-all"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-72 h-full bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-2xl font-bold mb-8">
              V<span className="text-accent">ender</span>
            </div>

            {user && (
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-warm-border">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                    {(user.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            )}

            <nav className="space-y-1">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className="block py-3 px-4 rounded-lg text-sm font-medium hover:bg-warm-100 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
              <div className="border-t border-warm-border my-4" />
              <Link href="/vendor/apply" className="block py-3 px-4 rounded-lg text-sm font-medium text-accent-dark hover:bg-warm-100">
                Sell on Vender
              </Link>
              {user ? (
                <>
                  <Link href="/account" className="block py-3 px-4 rounded-lg text-sm font-medium hover:bg-warm-100" onClick={() => setMobileMenuOpen(false)}>
                    My Account
                  </Link>
                  <button onClick={handleLogout} className="block w-full text-left py-3 px-4 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" className="block py-3 px-4 rounded-lg text-sm font-medium hover:bg-warm-100">
                  Sign In / Register
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
