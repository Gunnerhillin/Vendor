"use client"

import { useEffect, useState } from "react"
import { formatPrice, formatDate } from "@/lib/utils"
import { Zap, Check, X, AlertCircle } from "lucide-react"

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
}

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("pending")
  const [actionModal, setActionModal] = useState<any>(null)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchDeals() {
      const res = await fetch(`/api/deals?role=admin&status=${filter}`)
      const data = await res.json()
      if (data.deals) setDeals(data.deals)
      setLoading(false)
    }
    fetchDeals()
  }, [filter])

  const handleAction = async (dealId: string, status: string) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId, status, admin_notes: notes }),
      })
      if (res.ok) {
        setDeals(prev => prev.map(d =>
          d.id === dealId ? { ...d, status, admin_notes: notes } : d
        ))
        setActionModal(null)
        setNotes("")
      }
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
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
      <h1 className="font-display text-2xl font-semibold mb-2 flex items-center gap-2">
        <Zap size={24} className="text-amber-500" /> Flash Deals
      </h1>
      <p className="text-sm text-gray-400 mb-6">Approve or reject vendor flash deal requests. Approved deals update product pricing automatically.</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setFilter(tab); setLoading(true); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-accent text-white'
                : 'bg-white border border-warm-300 text-gray-600 hover:border-accent'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {deals.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Zap size={40} className="mx-auto mb-3 opacity-50" />
          <p>No {filter === 'all' ? '' : filter} flash deals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const now = new Date()
            const isLive = deal.status === 'approved' && new Date(deal.starts_at) <= now && new Date(deal.ends_at) >= now

            return (
              <div key={deal.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-lg bg-warm-100 overflow-hidden flex-shrink-0">
                    {deal.product?.images?.[0]?.url ? (
                      <img src={deal.product.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-sm">🛍️</div>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">{deal.product?.title || "Product"}</p>
                      <span className={`badge capitalize text-[10px] ${statusColors[deal.status] || ""}`}>
                        {deal.status}
                      </span>
                      {isLive && (
                        <span className="badge text-[10px] bg-green-500 text-white animate-pulse">LIVE</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500 mb-2">
                      <div>
                        <span className="text-gray-400">Vendor:</span>{" "}
                        <span className="font-medium text-gray-700">{deal.vendor?.business_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Discount:</span>{" "}
                        <span className="font-bold text-red-500">{deal.discount_percent}% off</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Price:</span>{" "}
                        <span className="font-medium text-gray-700">
                          {deal.sale_price ? formatPrice(deal.sale_price) : '—'}
                          {deal.product?.price && (
                            <span className="line-through text-gray-400 ml-1">{formatPrice(deal.product.price)}</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Duration:</span>{" "}
                        <span className="font-medium text-gray-700">{formatDate(deal.starts_at)} → {formatDate(deal.ends_at)}</span>
                      </div>
                    </div>

                    {deal.admin_notes && (
                      <div className="bg-warm-100 rounded-lg px-3 py-2 text-xs">
                        <span className="font-medium text-gray-600">Notes:</span> {deal.admin_notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {deal.status === 'pending' && (
                    <div className="flex-shrink-0 flex gap-2">
                      <button
                        onClick={() => setActionModal({ ...deal, action: 'approved' })}
                        className="text-xs font-semibold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Check size={14} className="inline mr-1" /> Approve
                      </button>
                      <button
                        onClick={() => setActionModal({ ...deal, action: 'rejected' })}
                        className="text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <X size={14} className="inline mr-1" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">
                {actionModal.action === 'approved' ? 'Approve Flash Deal' : 'Reject Flash Deal'}
              </h3>
              <button onClick={() => { setActionModal(null); setNotes(""); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-warm-100 rounded-lg p-3 text-xs">
                <p><span className="font-medium">Product:</span> {actionModal.product?.title}</p>
                <p><span className="font-medium">Vendor:</span> {actionModal.vendor?.business_name}</p>
                <p><span className="font-medium">Discount:</span> {actionModal.discount_percent}% off → {actionModal.sale_price ? formatPrice(actionModal.sale_price) : '—'}</p>
                <p><span className="font-medium">Duration:</span> {formatDate(actionModal.starts_at)} → {formatDate(actionModal.ends_at)}</p>
              </div>

              {actionModal.action === 'approved' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <AlertCircle size={12} className="inline mr-1" />
                  Approving will update the product price to the sale price when the deal starts.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note for the vendor..."
                  className="input min-h-[80px] resize-y"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setActionModal(null); setNotes(""); }} className="btn-outline flex-1 text-sm">
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(actionModal.id, actionModal.action)}
                  disabled={submitting}
                  className={`flex-1 text-sm font-semibold py-3 rounded-full transition-all ${
                    actionModal.action === 'rejected'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'btn-primary'
                  }`}
                >
                  {submitting ? 'Processing...' : actionModal.action === 'approved' ? 'Approve Deal' : 'Reject Deal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
