"use client"

import { useState } from "react"

const products: any[] = []

export default function AdminProductsPage() {
  const [filter, setFilter] = useState("pending")
  const filtered = filter === "all" ? products : products.filter(p => p.status === filter)

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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><span className="text-xl">{p.image}</span><span className="text-sm font-medium">{p.title}</span></div></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.vendor}</td>
                    <td className="px-6 py-4 text-sm font-medium">{p.price}</td>
                    <td className="px-6 py-4"><span className={`badge ${p.status === "approved" ? "badge-success" : p.status === "pending" ? "badge-warning" : "badge-danger"}`}>{p.status}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.submitted}</td>
                    <td className="px-6 py-4 text-right">
                      {p.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all">Approve</button>
                          <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all">Reject</button>
                        </div>
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
