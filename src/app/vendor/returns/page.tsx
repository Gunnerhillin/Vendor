"use client"

import { useEffect, useState } from "react"
import { formatPrice, formatDate } from "@/lib/utils"
import { RotateCcw, Check, X, AlertCircle } from "lucide-react"

const statusColors: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  denied: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
}

export default function VendorReturnsPage() {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [actionModal, setActionModal] = useState<any>(null)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchReturns() {
      const res = await fetch(`/api/returns?role=vendor${filter !== 'all' ? `&status=${filter}` : ''}`)
      const data = await res.json()
      if (data.returns) setReturns(data.returns)
      setLoading(false)
    }
    fetchReturns()
  }, [filter])

  const handleAction = async (returnId: string, status: string) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_id: returnId,
          status,
          resolution_notes: notes,
        }),
      })
      if (res.ok) {
        setReturns(prev => prev.map(r =>
          r.id === returnId ? { ...r, status } : r
        ))
        setActionModal(null)
        setNotes("")
      }
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
  }

  const counts = {
    all: returns.length,
    requested: returns.filter(r => r.status === 'requested').length,
    approved: returns.filter(r => r.status === 'approved').length,
  }

  if (loading) {
    return (
      <div className="max-w-4xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-semibold mb-2 flex items-center gap-2">
        <RotateCcw size={24} /> Return Requests
      </h1>
      <p className="text-sm text-gray-400 mb-6">Review and manage return requests from customers.</p>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 mb-6 flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Site-wide return policy applies</p>
          <p className="text-xs text-blue-600 mt-0.5">CutieValley&apos;s site-wide policy: items in returnable condition can be returned. Admin/customer service may override your decisions if a customer contacts them directly.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'requested', 'approved'] as const).map((tab) => (
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
            <span className="ml-1.5 text-xs opacity-70">({counts[tab as keyof typeof counts] || 0})</span>
          </button>
        ))}
      </div>

      {returns.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <RotateCcw size={40} className="mx-auto mb-3 opacity-50" />
          <p>No return requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns
            .filter(r => filter === 'all' || r.status === filter)
            .map((ret) => (
            <div key={ret.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-warm-100 overflow-hidden flex-shrink-0">
                  {ret.order_item?.product?.images?.[0]?.url ? (
                    <img src={ret.order_item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-sm">🛍️</div>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold">{ret.order_item?.product?.title || "Product"}</p>
                    <span className={`badge capitalize text-[10px] ${statusColors[ret.status] || ""}`}>
                      {ret.status}
                    </span>
                    {ret.admin_override && (
                      <span className="badge text-[10px] bg-purple-100 text-purple-700">Admin Override</span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mb-2">
                    {ret.customer?.full_name} &middot; {formatPrice((ret.order_item?.unit_price || 0) * (ret.order_item?.quantity || 1))} &middot; {formatDate(ret.created_at)}
                  </p>

                  <div className="bg-warm-100 rounded-lg px-3 py-2 text-xs">
                    <span className="font-medium text-gray-600">Reason:</span> {ret.reason}
                    {ret.description && <p className="text-gray-500 mt-1">{ret.description}</p>}
                  </div>

                  {ret.resolution_notes && (
                    <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs mt-2">
                      <span className="font-medium text-blue-700">Notes:</span> {ret.resolution_notes}
                    </div>
                  )}
                </div>

                {ret.status === 'requested' && (
                  <div className="flex-shrink-0 flex gap-2">
                    <button
                      onClick={() => setActionModal({ ...ret, action: 'approved' })}
                      className="text-xs font-semibold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Check size={14} className="inline mr-1" /> Approve
                    </button>
                    <button
                      onClick={() => setActionModal({ ...ret, action: 'denied' })}
                      className="text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <X size={14} className="inline mr-1" /> Deny
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">
                {actionModal.action === 'approved' ? 'Approve Return' : 'Deny Return'}
              </h3>
              <button onClick={() => { setActionModal(null); setNotes(""); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note for the customer..."
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
                    actionModal.action === 'denied'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'btn-primary'
                  }`}
                >
                  {submitting ? 'Processing...' : actionModal.action === 'approved' ? 'Approve Return' : 'Deny Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
