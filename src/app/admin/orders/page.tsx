"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"

export default function AdminOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*, customer:profiles(full_name, email), items:order_items(*, vendor:vendors(business_name), product:products(title))")
        .order("created_at", { ascending: false })

      if (data) setOrders(data)
      setLoading(false)
    }
    fetchOrders()
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)

    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">All Orders</h1>
      <div className="card">
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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4 text-sm font-medium">#{o.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(o.created_at)}</td>
                    <td className="px-6 py-4 text-sm">{o.customer?.full_name || o.customer?.email || "—"}</td>
                    <td className="px-6 py-4 text-sm">{o.items?.length || 0} items</td>
                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(o.total)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        o.status === "shipped" || o.status === "delivered" ? "badge-success" :
                        o.status === "processing" ? "badge-warning" :
                        o.status === "cancelled" || o.status === "refunded" ? "bg-red-100 text-red-700" :
                        "badge-info"
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        className="text-xs border border-warm-border rounded-lg px-2 py-1 bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
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
