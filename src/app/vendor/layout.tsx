"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, ShoppingCart, DollarSign, BarChart3, MessageSquare, Settings, RotateCcw, Zap } from "lucide-react"

const sidebarLinks = [
  { href: "/vendor/get-started", label: "Get Started", icon: LayoutDashboard },
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/products", label: "Products", icon: Package },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingCart },
  { href: "/vendor/deals", label: "Flash Deals", icon: Zap },
  { href: "/vendor/returns", label: "Returns", icon: RotateCcw },
  { href: "/vendor/earnings", label: "Earnings", icon: DollarSign },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/vendor/messages", label: "Messages", icon: MessageSquare },
  { href: "/vendor/settings", label: "Store Settings", icon: Settings },
]

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === "/vendor/apply") return <>{children}</>

  return (
    <div className="min-h-screen bg-warm-100">
      {/* Top bar */}
      <div className="bg-white border-b border-warm-border h-16 flex items-center justify-between px-6 sticky top-0 z-40">
        <Link href="/" className="font-display text-2xl font-bold">
          Cutie<span className="text-accent">Valley</span>
          <span className="text-xs font-sans font-normal text-gray-400 ml-2">Vendor Portal</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-accent transition-colors">View Storefront</Link>
          <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center text-sm font-bold">V</div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-warm-border min-h-[calc(100vh-64px)] sticky top-16 hidden md:block">
          <div className="p-6 border-b border-warm-border text-center">
            <div className="w-16 h-16 rounded-full bg-accent-light mx-auto mb-3 flex items-center justify-center text-2xl font-display font-bold">V</div>
            <h3 className="font-semibold">Your Store</h3>
            <p className="text-xs text-gray-400">Vendor Portal</p>
          </div>
          <nav className="p-3">
            {sidebarLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all mb-1 ${
                  pathname === href
                    ? "bg-warm-100 text-accent-dark font-semibold border-l-3 border-accent"
                    : "text-gray-500 hover:bg-warm-100 hover:text-primary"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
