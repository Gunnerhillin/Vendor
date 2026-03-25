"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Store, Package, ShoppingCart, DollarSign, BarChart3, Users, LogOut, RotateCcw, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/payouts", label: "Payouts", icon: DollarSign },
  { href: "/admin/deals", label: "Flash Deals", icon: Zap },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/revenue", label: "Revenue", icon: BarChart3 },
  { href: "/admin/users", label: "Users & Roles", icon: Users },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState("")

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single()

      if (profile?.role !== "admin") {
        router.push("/")
        return
      }

      setAdminName(profile.full_name || "Admin")
      setAuthorized(true)
      setLoading(false)
    }

    checkAdmin()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-warm-100">
      {/* Top bar */}
      <div className="bg-primary text-white h-14 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="font-display text-xl font-bold">
            Cutie<span className="text-accent">Valley</span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-accent px-2.5 py-1 rounded-full">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">View Site</Link>
          <button onClick={handleLogout} className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1">
            <LogOut size={14} /> Sign Out
          </button>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
            {adminName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-r border-warm-border min-h-[calc(100vh-56px)] sticky top-14 hidden md:block">
          <nav className="p-3">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all mb-1 ${
                  pathname === href
                    ? "bg-warm-100 text-accent-dark font-semibold"
                    : "text-gray-500 hover:bg-warm-100 hover:text-primary"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
