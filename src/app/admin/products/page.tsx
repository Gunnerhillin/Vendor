"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"

export default function AdminProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("pending")

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from("products")
        .select("*, vendor:vendors(business_name), category:categories(name), images:product_images(url)")
        .order("created_at", { ascending: false })

      if (data) setProducts(data)
      setLoading(false)
    }
    fetchProducts()
  }, [])

  const handleStatusChange = async (productId: string, newStatus: string) => {
    const { error } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", productId)

    if (!error) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p))
    }
  }

  const filtered = filter === "all" ? products : products.filter(p => p.status === filter)

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Product Moderation</h1>

      <div className="flex items-center gap-3 mb-6">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all ${filter === f ? "bg-primary text-white" : "bg-white text-gray-500 border border-warm-border hover:bg-warm-100"}`}>
            {f} ({f === "all" ? products.length : products.filter(p => p.status === f).length})
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-warm-100 overflow-hidden flex-shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>}
                        </div>
                        <span className="text-sm font-medium">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.vendor?.business_name || "—"}</td>
                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(p.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${p.status === "approved" ? "badge-success" : p.status === "pending" ? "badge-warning" : p.status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(p.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === "pending" && (
                          <>
                            <button onClick={() => handleStatusChange(p.id, "approved")} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all">Approve</button>
                            <button onClick={() => handleStatusChange(p.id, "rejected")} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all">Reject</button>
                          </>
                        )}
                        {p.status === "approved" && (
                          <button onClick={() => handleStatusChange(p.id, "rejected")} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all">Remove</button>
                        )}
                        {p.status === "rejected" && (
                          <button onClick={() => handleStatusChange(p.id, "approved")} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all">Approve</button>
                        )}
                      </div>
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
