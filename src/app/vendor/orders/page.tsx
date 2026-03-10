"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"
import { Package, Truck, Check, X } from "lucide-react"

const statusStyles: Record<string, string> = {
  shipped: "badge-success",
  delivered: "badge-success",
  processing: "badge-warning",
  pending: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-red-100 text-red-700",
}

const CARRIERS = [
  { value: 'usps', label: 'USPS' },
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'dhl', label: 'DHL' },
  { value: 'other', label: 'Other' },
]

export default function VendorOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [shippingModal, setShippingModal] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('usps')
  const [submitting, setSubmitting] = useState(false)

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
        .select("*, order:orders(id, created_at, status, shipping_name, shipping_city, shipping_state, shipping_line1, shipping_postal_code), product:products(title, slug, images:product_images(url))")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })

      if (items) setOrders(items)
      setLoading(false)
    }
    fetchOrders()
  }, [])

  const handleMarkShipped = async (orderItemId: string, orderId: string) => {
    setSubmitting(true)

    // Update order item status
    const { error } = await supabase
      .from("order_items")
      .update({
        status: "shipped",
        tracking_number: trackingNumber || null,
        shipping_carrier: carrier || null,
      })
      .eq("id", orderItemId)

    if (!error) {
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderItemId
        ? { ...o, status: "shipped", tracking_number: trackingNumber, shipping_carrier: carrier }
        : o
      ))

      // Check if ALL items in this order are now shipped
      const { data: allItems } = await supabase
        .from("order_items")
        .select("status")
        .eq("order_id", orderId)

      if (allItems && allItems.every(i => i.status === 'shipped' || i.status === 'delivered')) {
        await supabase.from("orders").update({ status: "shipped" }).eq("id", orderId)
      }

      // Send shipping notification email
      fetch('/api/email/shipping-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderItemId,
          status: 'shipped',
          trackingNumber: trackingNumber || undefined,
          carrier: carrier || undefined,
        }),
      }).catch(err => console.error('Email notification failed:', err))

      setShippingModal(null)
      setTrackingNumber('')
      setCarrier('usps')
    }

    setSubmitting(false)
  }

  const handleMarkDelivered = async (orderItemId: string, orderId: string) => {
    const { error } = await supabase
      .from("order_items")
      .update({ status: "delivered" })
      .eq("id", orderItemId)

    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderItemId ? { ...o, status: "delivered" } : o))

      const { data: allItems } = await supabase
        .from("order_items")
        .select("status")
        .eq("order_id", orderId)

      if (allItems && allItems.every(i => i.status === 'delivered')) {
        await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId)
      }
    }
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const counts = {
    all: orders.length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
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

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'processing', 'shipped', 'delivered'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-accent text-white'
                : 'bg-white border border-warm-300 text-gray-600 hover:border-accent'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">({counts[tab]})</span>
          </button>
        ))}
      </div>

      <div className="card">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-50" />
            <p>No {filter === 'all' ? '' : filter} orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ship To</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4 text-sm font-medium">#{o.order?.id?.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{o.order?.created_at ? formatDate(o.order.created_at) : "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-warm-100 overflow-hidden flex-shrink-0">
                          {o.product?.images?.[0]?.url ? (
                            <img src={o.product.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : <div className="w-full h-full flex items-center justify-center text-xs">🛍️</div>}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{o.product?.title || "—"}</p>
                          <p className="text-xs text-gray-400">Qty: {o.quantity}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{o.order?.shipping_name || "—"}</p>
                      <p className="text-xs text-gray-400">
                        {[o.order?.shipping_city, o.order?.shipping_state].filter(Boolean).join(', ')}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(o.unit_price * o.quantity)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge capitalize ${statusStyles[o.status] || ""}`}>{o.status}</span>
                      {o.tracking_number && (
                        <p className="text-[10px] text-gray-400 mt-1 font-mono">{o.shipping_carrier?.toUpperCase()}: {o.tracking_number}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-y-1">
                      {o.status === "processing" && (
                        <button
                          onClick={() => setShippingModal(o.id)}
                          className="flex items-center gap-1.5 ml-auto text-xs font-semibold text-accent-dark hover:underline"
                        >
                          <Truck size={14} /> Ship Order
                        </button>
                      )}
                      {o.status === "shipped" && (
                        <button
                          onClick={() => handleMarkDelivered(o.id, o.order?.id)}
                          className="flex items-center gap-1.5 ml-auto text-xs font-semibold text-green-600 hover:underline"
                        >
                          <Check size={14} /> Mark Delivered
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shipping Modal */}
      {shippingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Ship Order</h3>
              <button onClick={() => setShippingModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Carrier</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="input"
                >
                  {CARRIERS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number (optional)"
                  className="input font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">Customers will receive an email with tracking info.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShippingModal(null)}
                  className="btn-outline flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const order = orders.find(o => o.id === shippingModal)
                    if (order) handleMarkShipped(shippingModal, order.order?.id)
                  }}
                  disabled={submitting}
                  className="btn-primary flex-1 text-sm"
                >
                  {submitting ? 'Updating...' : 'Confirm Shipment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
