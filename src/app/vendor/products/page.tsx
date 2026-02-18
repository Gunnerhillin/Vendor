"use client"

import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react"
import { useState } from "react"

const products: any[] = []

export default function VendorProductsPage() {
  const [filter, setFilter] = useState("all")

  const filtered = filter === "all" ? products : products.filter(p => p.status === filter)

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <button className="btn-primary btn-sm">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        {["all", "approved", "pending", "draft"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all ${
              filter === f ? "bg-primary text-white" : "bg-white text-gray-500 border border-warm-border hover:bg-warm-100"
            }`}
          >
            {f} ({f === "all" ? products.length : products.filter(p => p.status === f).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search products..." className="input pl-11 max-w-sm" />
      </div>

      {/* Table */}
      <div className="card">
        {products.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No products yet. Click &ldquo;Add Product&rdquo; to create your first listing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inventory</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{p.image}</span>
                        <span className="text-sm font-medium">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{p.price}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={p.inventory < 20 ? "text-red-500 font-semibold" : ""}>{p.inventory}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">{p.sold}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        p.status === "approved" ? "badge-success" :
                        p.status === "pending" ? "badge-warning" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-warm-100 rounded-lg text-gray-400 hover:text-primary"><Eye size={16} /></button>
                        <button className="p-2 hover:bg-warm-100 rounded-lg text-gray-400 hover:text-primary"><Edit size={16} /></button>
                        <button className="p-2 hover:bg-warm-100 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
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
