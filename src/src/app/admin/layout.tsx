"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Store, Package, ShoppingCart, DollarSign, BarChart3, Settings, Users } from "lucide-react"

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/payouts", label: "Payouts", icon: DollarSign },
  { href: "/admin/revenue", label: "Revenue", icon: BarChart3 },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-warm-100">
      {/* Top bar */}
      <div className="bg-primary text-white h-14 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="font-display text-xl font-bold">
            V<span className="text-accent">ender</span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-accent px-2.5 py-1 rounded-full">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">View Site</Link>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold">A</div>
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
