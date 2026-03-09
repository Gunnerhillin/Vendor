"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"
import { Package } from "lucide-react"
import Link from "next/link"

export default function AccountOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("orders")
        .select("*, items:order_items(*, product:products(title, slug, images:product_images(url)), vendor:vendors(business_name))")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })

      if (data) setOrders(data)
      setLoading(false)
    }
    fetchOrders()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 mb-4">No orders yet</p>
          <Link href="/" className="btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <span className={`badge ${
                    order.status === "delivered" ? "badge-success" :
                    order.status === "shipped" ? "badge-success" :
                    order.status === "processing" ? "badge-warning" :
                    order.status === "cancelled" ? "bg-red-100 text-red-700" :
                    "badge-info"
                  }`}>
                    {order.status}
                  </span>
                  <p className="text-sm font-bold mt-1">{formatPrice(order.total)}</p>
                </div>
              </div>
              <div className="space-y-3">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-warm-100 overflow-hidden flex-shrink-0">
                      {item.product?.images?.[0]?.url ? (
                        <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full flex items-center justify-center">🛍️</div>}
                    </div>
                    <div className="flex-1">
                      <Link href={`/products/${item.product?.slug || ''}`} className="text-sm font-medium hover:text-accent">{item.product?.title || "Product"}</Link>
                      <p className="text-xs text-gray-400">by {item.vendor?.business_name || "—"} • Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
