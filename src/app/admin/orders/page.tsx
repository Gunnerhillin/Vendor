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

  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  async function confirmDelivery(itemId: string) {
    setSaving(itemId); setError('')
    const { data, error } = await supabase.rpc('update_fulfillment', { item_id: itemId, next_status: 'delivered' })
    if (error) setError(error.message)
    else setOrders(previous => previous.map(order => ({ ...order, items: order.items.map((item: any) => item.id === itemId ? { ...item, ...data } : item) })))
    setSaving(null)
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
      <p className="text-sm mb-4">Verify carrier delivery before confirming an item. Confirmation makes it eligible for payout review; it does not send money.</p>{error && <p role="alert" className="text-red-700 mb-4">{error}</p>}<div className="card">
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
                      {o.items?.map((item: any) => <div key={item.id} className="mb-3 text-xs">
                        <p>{item.product_title || item.product?.title} · {item.vendor?.business_name}</p>
                        <p>{item.status} {item.shipping_carrier} {item.tracking_number}</p>
                        {item.delivery_confirmed_at ? <span className="text-green-700">Delivery verified</span> :
                          ['shipped','delivered'].includes(item.status) && <button disabled={saving !== null} onClick={() => confirmDelivery(item.id)} className="underline text-accent-dark">{saving === item.id ? 'Saving…' : 'Confirm verified delivery'}</button>}
                      </div>)}

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
