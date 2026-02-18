"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface VendorRow {
  id: string
  user_id: string
  business_name: string
  slug: string
  description: string | null
  status: string
  applied_at: string
  approved_at: string | null
  product_count: number
  total_revenue: number
}

export default function AdminVendorsPage() {
  const supabase = createClient()
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchVendors() {
      const { data } = await supabase
        .from("vendors")
        .select("*")
        .order("applied_at", { ascending: false })

      if (data) setVendors(data)
      setLoading(false)
    }
    fetchVendors()
  }, [])

  const handleStatusChange = async (vendorId: string, newStatus: string) => {
    const updates: any = { status: newStatus }
    if (newStatus === "approved") updates.approved_at = new Date().toISOString()

    const { error } = await supabase
      .from("vendors")
      .update(updates)
      .eq("id", vendorId)

    if (!error) {
      setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, ...updates } : v))
    }
  }

  const filtered = vendors.filter(v => {
    const matchesFilter = filter === "all" || v.status === filter
    const matchesSearch = !searchQuery || v.business_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Vendor Management</h1>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {["all", "approved", "pending", "rejected", "frozen"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all ${filter === f ? "bg-primary text-white" : "bg-white text-gray-500 border border-warm-border hover:bg-warm-100"}`}>
            {f} ({f === "all" ? vendors.length : vendors.filter(v => v.status === f).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search vendors..."
          className="input pl-11 max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <p>Loading vendors...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No vendors found</p>
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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Applied</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">{v.business_name}</p>
                        <p className="text-xs text-gray-400">{v.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{v.product_count}</td>
                    <td className="px-6 py-4 text-sm font-medium">${v.total_revenue.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        v.status === "approved" ? "badge-success" :
                        v.status === "pending" ? "badge-warning" :
                        v.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(v.applied_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {v.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(v.id, "approved")}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(v.id, "rejected")}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {v.status === "approved" && (
                          <button
                            onClick={() => handleStatusChange(v.id, "frozen")}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all"
                          >
                            Freeze
                          </button>
                        )}
                        {v.status === "frozen" && (
                          <button
                            onClick={() => handleStatusChange(v.id, "approved")}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all"
                          >
                            Unfreeze
                          </button>
                        )}
                        {v.status === "rejected" && (
                          <button
                            onClick={() => handleStatusChange(v.id, "approved")}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all"
                          >
                            Approve
                          </button>
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
