"use client"

import { useState } from "react"
import { Search, MoreHorizontal } from "lucide-react"

const vendors: any[] = []

export default function AdminVendorsPage() {
  const [filter, setFilter] = useState("all")
  const filtered = filter === "all" ? vendors : vendors.filter(v => v.status === filter)

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Vendor Management</h1>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {["all", "approved", "pending", "frozen"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all ${filter === f ? "bg-primary text-white" : "bg-white text-gray-500 border border-warm-border hover:bg-warm-100"}`}>
            {f} ({f === "all" ? vendors.length : vendors.filter(v => v.status === f).length})
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No vendors yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Products</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">{v.name}</p>
                        <p className="text-xs text-gray-400">{v.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{v.products}</td>
                    <td className="px-6 py-4 text-sm font-medium">{v.revenue}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${v.status === "approved" ? "badge-success" : v.status === "pending" ? "badge-warning" : "badge-danger"}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{v.joined}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {v.status === "pending" && (
                          <>
                            <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all">Approve</button>
                            <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all">Reject</button>
                          </>
                        )}
                        {v.status === "approved" && (
                          <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all">Freeze</button>
                        )}
                        {v.status === "frozen" && (
                          <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all">Unfreeze</button>
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
