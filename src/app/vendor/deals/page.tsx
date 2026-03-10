"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"
import { Zap, Plus, X, Check, Clock, AlertCircle } from "lucide-react"

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
}

export default function VendorDealsPage() {
  const supabase = createClient()
  const [deals, setDeals] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Create form
  const [selectedProduct, setSelectedProduct] = useState("")
  const [discountPercent, setDiscountPercent] = useState("15")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [createError, setCreateError] = useState("")

  useEffect(() => {
    async function fetchData() {
      // Fetch deals
      const res = await fetch('/api/deals?role=vendor')
      const data = await res.json()
      if (data.deals) setDeals(data.deals)

      // Fetch vendor's approved products for the dropdown
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single()
        if (vendor) {
          const { data: prods } = await supabase
            .from('products')
            .select('id, title, price')
            .eq('vendor_id', vendor.id)
            .eq('status', 'approved')
            .order('title')
          if (prods) setProducts(prods)
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleCreate = async () => {
    setCreateError("")
    if (!selectedProduct || !discountPercent || !startDate || !endDate) {
      setCreateError("All fields are required")
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    if (days < 3 || days > 6) {
      setCreateError("Flash deals must run for 3-6 days")
      return
    }

    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const salePrice = Math.round(product.price * (1 - parseInt(discountPercent) / 100) * 100) / 100

    setSubmitting(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          discount_percent: parseInt(discountPercent),
          sale_price: salePrice,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error)
      } else {
        // Refresh deals list
        const refreshRes = await fetch('/api/deals?role=vendor')
        const refreshData = await refreshRes.json()
        if (refreshData.deals) setDeals(refreshData.deals)
        setShowCreate(false)
        setSelectedProduct("")
        setDiscountPercent("15")
        setStartDate("")
        setEndDate("")
      }
    } catch {
      setCreateError("Failed to create deal")
    }
    setSubmitting(false)
  }

  // Calculate preview sale price
  const previewProduct = products.find(p => p.id === selectedProduct)
  const previewSalePrice = previewProduct
    ? Math.round(previewProduct.price * (1 - parseInt(discountPercent || "0") / 100) * 100) / 100
    : 0

  if (loading) {
    return (
      <div className="max-w-4xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <Zap size={24} className="text-amber-500" /> Flash Deals
          </h1>
          <p className="text-sm text-gray-400 mt-1">Create limited-time discounts to push sales. Deals run 3-6 days and require admin approval.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus size={16} /> New Flash Deal
        </button>
      </div>

      {/* Deals list */}
      {deals.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Zap size={40} className="mx-auto mb-3 opacity-50" />
          <p className="mb-2">No flash deals yet</p>
          <p className="text-xs">Create your first flash deal to boost sales on a product.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const now = new Date()
            const isLive = deal.status === 'approved' && new Date(deal.starts_at) <= now && new Date(deal.ends_at) >= now
            const daysLeft = isLive ? Math.ceil((new Date(deal.ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

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
                        <span className="badge text-[10px] bg-green-500 text-white animate-pulse">
                          LIVE — {daysLeft}d left
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        <span className="text-red-500 font-bold">{deal.discount_percent}% off</span>
                        {deal.sale_price && (
                          <> — {formatPrice(deal.sale_price)} <span className="line-through text-gray-400">{formatPrice(deal.product?.price)}</span></>
                        )}
                      </span>
                      <span>{formatDate(deal.starts_at)} → {formatDate(deal.ends_at)}</span>
                    </div>

                    {deal.admin_notes && (
                      <div className="mt-2 bg-warm-100 rounded-lg px-3 py-2 text-xs">
                        <span className="font-medium text-gray-600">Admin notes:</span> {deal.admin_notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Deal Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Zap size={18} className="text-amber-500" /> Create Flash Deal
              </h3>
              <button onClick={() => { setShowCreate(false); setCreateError(""); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4 flex items-center gap-2">
                <AlertCircle size={14} /> {createError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="input"
                >
                  <option value="">Select a product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title} — {formatPrice(p.price)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="5"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-lg font-bold text-red-500 w-16 text-right">{discountPercent}%</span>
                </div>
              </div>

              {previewProduct && (
                <div className="bg-warm-100 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Original Price</p>
                    <p className="text-sm line-through text-gray-500">{formatPrice(previewProduct.price)}</p>
                  </div>
                  <div className="text-2xl text-gray-300">→</div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Flash Sale Price</p>
                    <p className="text-lg font-bold text-red-500">{formatPrice(previewSalePrice)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      // Auto-set end date to start + 4 days
                      if (e.target.value) {
                        const s = new Date(e.target.value)
                        s.setDate(s.getDate() + 4)
                        setEndDate(s.toISOString().split('T')[0])
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="input"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                <Clock size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Flash deals must run 3-6 days</p>
                  <p className="mt-0.5">Your deal will go live after admin approval. The product price will automatically update when the deal starts and revert when it ends.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowCreate(false); setCreateError(""); }} className="btn-outline flex-1 text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting || !selectedProduct}
                  className="btn-primary flex-1 text-sm"
                >
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
