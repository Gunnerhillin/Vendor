"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"
import { Package, Truck, MapPin, RotateCcw, X, Check } from "lucide-react"
import Link from "next/link"

const statusColors: Record<string, string> = {
  delivered: "badge-success",
  shipped: "badge-success",
  processing: "badge-warning",
  pending: "badge-info",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-red-100 text-red-700",
}

const returnStatusColors: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  denied: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
}

const carrierTrackingUrls: Record<string, string> = {
  usps: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  ups: 'https://www.ups.com/track?tracknum=',
  fedex: 'https://www.fedex.com/fedextrack/?trknbr=',
  dhl: 'https://www.dhl.com/us-en/home/tracking.html?tracking-id=',
}

const RETURN_REASONS = [
  "Item arrived damaged",
  "Wrong item received",
  "Item doesn't match description",
  "Changed my mind",
  "Item doesn't fit",
  "Quality not as expected",
  "Other",
]

export default function AccountOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [returnModal, setReturnModal] = useState<{ itemId: string; orderId: string } | null>(null)
  const [returnReason, setReturnReason] = useState("")
  const [returnDescription, setReturnDescription] = useState("")
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [returnSuccess, setReturnSuccess] = useState(false)

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

  const handleReturnRequest = async () => {
    if (!returnModal || !returnReason) return
    setReturnSubmitting(true)
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_item_id: returnModal.itemId,
          reason: returnReason,
          description: returnDescription || undefined,
        }),
      })
      if (res.ok) {
        setReturnSuccess(true)
        // Update local state
        setOrders(prev => prev.map(o => ({
          ...o,
          items: o.items?.map((item: any) =>
            item.id === returnModal.itemId
              ? { ...item, return_status: 'requested' }
              : item
          )
        })))
        setTimeout(() => {
          setReturnModal(null)
          setReturnReason("")
          setReturnDescription("")
          setReturnSuccess(false)
        }, 2000)
      }
    } catch (err) {
      console.error(err)
    }
    setReturnSubmitting(false)
  }

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
            <div key={order.id} className="card overflow-hidden">
              {/* Order Header */}
              <div className="flex items-center justify-between p-6 bg-warm-100/50 border-b border-warm-border">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Order Placed</p>
                    <p className="text-sm font-medium">{formatDate(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Total</p>
                    <p className="text-sm font-bold">{formatPrice(order.total)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`badge capitalize ${statusColors[order.status] || "badge-info"}`}>
                    {order.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">#{order.id.slice(0, 8)}</p>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-6 space-y-4">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-lg bg-warm-100 overflow-hidden flex-shrink-0">
                      {item.product?.images?.[0]?.url ? (
                        <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.product?.slug || ''}`} className="text-sm font-medium hover:text-accent block">
                        {item.product?.title || "Product"}
                      </Link>
                      <p className="text-xs text-gray-400">by {item.vendor?.business_name || "—"} &middot; Qty: {item.quantity}</p>

                      {/* Tracking info */}
                      {item.tracking_number && (
                        <div className="flex items-center gap-2 mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <Truck size={14} className="text-green-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-green-800">
                              {item.shipping_carrier?.toUpperCase() || 'Tracking'}:
                              {carrierTrackingUrls[item.shipping_carrier] ? (
                                <a
                                  href={`${carrierTrackingUrls[item.shipping_carrier]}${item.tracking_number}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 font-mono underline"
                                >
                                  {item.tracking_number}
                                </a>
                              ) : (
                                <span className="ml-1 font-mono">{item.tracking_number}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Return status */}
                      {item.return_status && (
                        <div className="mt-2">
                          <span className={`badge capitalize text-[10px] ${returnStatusColors[item.return_status] || ""}`}>
                            <RotateCcw size={10} className="mr-1" />
                            Return {item.return_status}
                          </span>
                        </div>
                      )}

                      {/* Return button for delivered items */}
                      {(item.status === 'delivered' || item.status === 'shipped') && !item.return_status && item.status !== 'refunded' && (
                        <button
                          onClick={() => setReturnModal({ itemId: item.id, orderId: order.id })}
                          className="mt-2 text-xs text-gray-400 hover:text-accent flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw size={11} /> Request Return
                        </button>
                      )}

                      {/* Item status if different from order */}
                      {item.status !== order.status && !item.return_status && (
                        <span className={`badge capitalize mt-2 text-[10px] ${statusColors[item.status] || ""}`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Shipping Address */}
              {order.shipping_name && (
                <div className="px-6 pb-4">
                  <div className="flex items-start gap-2 text-xs text-gray-400">
                    <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                    <span>
                      {order.shipping_name}, {order.shipping_line1}
                      {order.shipping_line2 ? `, ${order.shipping_line2}` : ''},
                      {' '}{order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Return Request Modal */}
      {returnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            {returnSuccess ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 mx-auto mb-3 flex items-center justify-center">
                  <Check size={24} className="text-green-600" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-1">Return Requested</h3>
                <p className="text-sm text-gray-500">We&apos;ll review your request and get back to you via email.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                    <RotateCcw size={18} /> Request a Return
                  </h3>
                  <button onClick={() => { setReturnModal(null); setReturnReason(""); setReturnDescription(""); }} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Return</label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="input"
                    >
                      <option value="">Select a reason</option>
                      {RETURN_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Details (optional)</label>
                    <textarea
                      value={returnDescription}
                      onChange={(e) => setReturnDescription(e.target.value)}
                      placeholder="Tell us more about why you'd like to return this item..."
                      className="input min-h-[80px] resize-y"
                    />
                  </div>

                  <div className="bg-warm-100 rounded-lg p-3 text-xs text-gray-500">
                    <p className="font-medium text-gray-600 mb-1">Return Policy</p>
                    <p>Items must be in original, unused condition. Returns are processed within 30 days of delivery. You&apos;ll receive an email with return instructions once approved.</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { setReturnModal(null); setReturnReason(""); setReturnDescription(""); }}
                      className="btn-outline flex-1 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReturnRequest}
                      disabled={returnSubmitting || !returnReason}
                      className="btn-primary flex-1 text-sm"
                    >
                      {returnSubmitting ? 'Submitting...' : 'Submit Return Request'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
