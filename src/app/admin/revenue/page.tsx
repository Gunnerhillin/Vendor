"use client"

import { useEffect, useState } from "react"
import { DollarSign, TrendingUp, Users, ShoppingCart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"

export default function AdminRevenuePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [totalGMV, setTotalGMV] = useState(0)
  const [totalCommission, setTotalCommission] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [activeVendors, setActiveVendors] = useState(0)
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    async function fetchRevenue() {
      // Orders
      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })

      if (orderData) {
        setOrders(orderData)
        setTotalOrders(orderData.length)
        const gmv = orderData.reduce((sum, o) => sum + Number(o.total), 0)
        setTotalGMV(gmv)
        setTotalCommission(gmv * 0.25) // 25% commission
      }

      // Vendors
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id")
        .eq("status", "approved")

      if (vendorData) setActiveVendors(vendorData.length)
      setLoading(false)
    }
    fetchRevenue()
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Revenue Analytics</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><DollarSign size={14} /> Gross Merchandise Value</div>
          <p className="text-2xl font-bold">{formatPrice(totalGMV)}</p>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><TrendingUp size={14} /> Platform Commission</div>
          <p className="text-2xl font-bold">{formatPrice(totalCommission)}</p>
          <p className="text-xs text-gray-400 font-semibold mt-1">25% avg rate</p>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><ShoppingCart size={14} /> Total Orders</div>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><Users size={14} /> Active Vendors</div>
          <p className="text-2xl font-bold">{activeVendors}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Recent Orders</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Commission (25%)</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((o) => (
                  <tr key={o.id} className="border-b border-warm-border last:border-0">
                    <td className="px-6 py-4 text-sm font-medium">#{o.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(o.created_at)}</td>
                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(o.total)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-accent-dark">{formatPrice(o.total * 0.25)}</td>
                    <td className="px-6 py-4"><span className={`badge ${o.status === "delivered" ? "badge-success" : o.status === "processing" ? "badge-warning" : "badge-info"}`}>{o.status}</span></td>
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
