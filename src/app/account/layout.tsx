'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { User, Package, Settings, Heart, LogOut, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import type { Profile } from '@/types'

const sideLinks = [
  { href: '/account', label: 'My Profile', icon: User },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/account/settings', label: 'Settings', icon: Settings },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      if (profile) setUser(profile as Profile)
      setLoading(false)
    }
    check()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-warm-100">
        <div className="section-padding py-8">
          <h1 className="text-2xl font-display font-bold text-primary mb-6">My Account</h1>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <aside className="md:w-64 shrink-0">
              <div className="bg-white rounded-xl border border-warm-300 overflow-hidden">
                {/* Profile card */}
                <div className="p-5 text-center border-b border-warm-300">
                  {user?.avatar_url ? (
                    <Image src={user.avatar_url} alt="" width={80} height={80} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-accent" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-accent-dark">
                      {(user?.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="font-semibold text-primary">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>

                <nav className="p-2">
                  {sideLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                        pathname === href
                          ? 'bg-warm-100 text-accent-dark font-semibold'
                          : 'text-gray-500 hover:bg-warm-100 hover:text-primary'
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all w-full mt-1"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </nav>
              </div>
            </aside>

            {/* Content */}
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
