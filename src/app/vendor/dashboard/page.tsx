"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Package, ShoppingCart, DollarSign, ArrowUpRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"
import Link from "next/link"

export default function VendorDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [activeProducts, setActiveProducts] = useState(0)
  const [pendingProducts, setPendingProducts] = useState(0)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [vendorName, setVendorName] = useState("")

  useEffect(() => {
    async function fetchDashboard() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: vendor } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (!vendor) return
      setVendorName(vendor.business_name)
      setTotalRevenue(vendor.total_revenue || 0)

      // Products
      const { data: products } = await supabase
        .from("products")
        .select("id, status")
        .eq("vendor_id", vendor.id)

      if (products) {
        setActiveProducts(products.filter(p => p.status === "approved").length)
        setPendingProducts(products.filter(p => p.status === "pending").length)
      }

      // Orders for this vendor
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*, order:orders(id, status, created_at, total, customer_id, customer:profiles(full_name)), product:products(title)")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (orderItems) {
        setTotalOrders(orderItems.length)
        setRecentOrders(orderItems)
      }

      setLoading(false)
    }
    fetchDashboard()
  }, [])

  const stats = [
    { label: "Total Revenue", value: formatPrice(totalRevenue), change: vendorName ? "From all sales" : "No data yet", up: true, icon: DollarSign },
    { label: "Orders", value: String(totalOrders), change: totalOrders > 0 ? `${totalOrders} total` : "No orders yet", up: true, icon: ShoppingCart },
    { label: "Active Products", value: String(activeProducts), change: pendingProducts > 0 ? `${pendingProducts} pending` : "All approved", up: true, icon: Package },
    { label: "Next Payout", value: "$0", change: "No payouts yet", up: true, icon: TrendingUp },
  ]

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Vendor Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, change, up, icon: Icon }) => (
          <div key={label} className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{label}</span>
              <Icon size={18} className="text-accent" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${up ? "text-green-600" : "text-red-500"}`}>
              {up && <ArrowUpRight size={12} />}
              {change}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href="/vendor/orders" className="text-xs font-medium text-accent-dark hover:underline">View All</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((item) => (
                  <tr key={item.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4 text-sm font-medium">#{item.order?.id?.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm">{item.product?.title || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.order?.customer?.full_name || "—"}</td>
                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(item.unit_price * item.quantity)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        item.status === "shipped" || item.status === "delivered" ? "badge-success" :
                        item.status === "processing" ? "badge-warning" :
                        item.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "badge-info"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
