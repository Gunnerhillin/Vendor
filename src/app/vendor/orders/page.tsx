"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  shipped: "badge-success",
  delivered: "badge-success",
  processing: "badge-warning",
  pending: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-red-100 text-red-700",
}

export default function VendorOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!vendor) return

      const { data: items } = await supabase
        .from("order_items")
        .select("*, order:orders(id, created_at, status, shipping_name, shipping_city, shipping_state), product:products(title, slug, images:product_images(url))")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })

      if (items) setOrders(items)
      setLoading(false)
    }
    fetchOrders()
  }, [])

  const handleMarkShipped = async (orderItemId: string) => {
    const { error } = await supabase
      .from("order_items")
      .update({ status: "shipped" })
      .eq("id", orderItemId)

    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderItemId ? { ...o, status: "shipped" } : o))
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
      <h1 className="font-display text-2xl font-semibold mb-6">Orders</h1>

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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4 text-sm font-medium">#{o.order?.id?.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{o.order?.created_at ? formatDate(o.order.created_at) : "—"}</td>
                    <td className="px-6 py-4 text-sm">{o.product?.title || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{o.order?.shipping_name || "—"}</td>
                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(o.unit_price * o.quantity)}</td>
                    <td className="px-6 py-4"><span className={`badge capitalize ${statusStyles[o.status] || ""}`}>{o.status}</span></td>
                    <td className="px-6 py-4 text-right">
                      {o.status === "processing" && (
                        <button onClick={() => handleMarkShipped(o.id)} className="text-xs font-semibold text-accent-dark hover:underline">Mark Shipped</button>
                      )}
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
