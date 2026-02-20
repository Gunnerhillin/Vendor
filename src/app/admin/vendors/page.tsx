"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, ChevronUp, ExternalLink, DollarSign, Package, Tag, Globe, Image as ImageIcon, Trash2 } from "lucide-react"
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
  commission_rate: number
  sample_images: string[] | null
}

interface ProductRow {
  id: string
  title: string
  slug: string
  description: string
  price: number
  compare_at_price: number | null
  status: string
  inventory_count: number
  images: { url: string; alt: string | null }[]
}

export default function AdminVendorsPage() {
  const supabase = createClient()
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null)
  const [vendorProducts, setVendorProducts] = useState<Record<string, ProductRow[]>>({})
  const [vendorImages, setVendorImages] = useState<Record<string, string[]>>({})
  const [loadingProducts, setLoadingProducts] = useState<string | null>(null)

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

  const toggleExpand = async (vendorId: string, userId: string) => {
    if (expandedVendor === vendorId) {
      setExpandedVendor(null)
      return
    }

    setExpandedVendor(vendorId)

    // Only fetch if we haven't already
    if (!vendorProducts[vendorId]) {
      setLoadingProducts(vendorId)

      // Fetch vendor's products
      const { data: products } = await supabase
        .from("products")
        .select("id, title, slug, description, price, compare_at_price, status, inventory_count, images:product_images(url, alt)")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })

      setVendorProducts(prev => ({ ...prev, [vendorId]: products || [] }))

      // Get sample images from the vendor record (stored during application)
      const vendor = vendors.find(v => v.id === vendorId)
      if (vendor?.sample_images && vendor.sample_images.length > 0) {
        setVendorImages(prev => ({ ...prev, [vendorId]: vendor.sample_images as string[] }))
      }

      setLoadingProducts(null)
    }
  }

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

  const handleProductStatus = async (productId: string, vendorId: string, newStatus: string) => {
    const { error } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", productId)

    if (!error) {
      setVendorProducts(prev => ({
        ...prev,
        [vendorId]: (prev[vendorId] || []).map(p =>
          p.id === productId ? { ...p, status: newStatus } : p
        )
      }))
    }
  }

  const handleDeleteVendor = async (vendorId: string, businessName: string) => {
    if (!confirm(`Are you sure you want to delete "${businessName}"? This will permanently remove the vendor application and cannot be undone.`)) {
      return
    }

    const { error } = await supabase
      .from("vendors")
      .delete()
      .eq("id", vendorId)

    if (!error) {
      setVendors(prev => prev.filter(v => v.id !== vendorId))
      if (expandedVendor === vendorId) setExpandedVendor(null)
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

      <div className="space-y-4">
        {loading ? (
          <div className="card p-12 text-center text-gray-400">
            <p>Loading vendors...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <p>No vendors found</p>
          </div>
        ) : (
          filtered.map((v) => (
            <div key={v.id} className="card overflow-hidden">
              {/* Vendor Header Row */}
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-warm-100/50 transition-colors"
                onClick={() => toggleExpand(v.id, v.user_id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-sm font-display font-bold">
                    {v.business_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{v.business_name}</p>
                      <span className={`badge text-[10px] ${
                        v.status === "approved" ? "badge-success" :
                        v.status === "pending" ? "badge-warning" :
                        v.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {v.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Applied {formatDate(v.applied_at)} &bull; {v.product_count} products &bull; ${v.total_revenue.toFixed(2)} revenue</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Action buttons */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                    <button
                      onClick={() => handleDeleteVendor(v.id, v.business_name)}
                      className="p-1.5 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                      title="Delete application"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Expand chevron */}
                  {expandedVendor === v.id ? (
                    <ChevronUp size={18} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedVendor === v.id && (
                <div className="border-t border-warm-border bg-warm-100/30">
                  {/* Vendor Info */}
                  <div className="px-6 py-5 border-b border-warm-border">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Application Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Business Description</p>
                        <p className="text-sm text-gray-700">{v.description || "No description provided"}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Tag size={14} className="text-gray-400" />
                          <span className="text-gray-500">Store URL:</span>
                          <span className="font-medium">/shop/{v.slug}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign size={14} className="text-gray-400" />
                          <span className="text-gray-500">Commission Rate:</span>
                          <span className="font-medium">{((v.commission_rate || 0.25) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Application Product Images */}
                  {vendorImages[v.id] && vendorImages[v.id].length > 0 && (
                    <div className="px-6 py-5 border-b border-warm-border">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ImageIcon size={14} />
                        Product Samples from Application
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {vendorImages[v.id].map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square rounded-lg overflow-hidden bg-white border border-warm-border hover:border-accent transition-colors group"
                          >
                            <img src={url} alt={`Sample ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products List */}
                  <div className="px-6 py-5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Package size={14} />
                      Products ({vendorProducts[v.id]?.length || 0})
                    </h3>

                    {loadingProducts === v.id ? (
                      <div className="py-8 text-center text-gray-400">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm">Loading products...</p>
                      </div>
                    ) : !vendorProducts[v.id] || vendorProducts[v.id].length === 0 ? (
                      <div className="py-6 text-center text-gray-400 bg-white rounded-lg border border-warm-border">
                        <p className="text-sm">No products listed yet</p>
                        <p className="text-xs mt-1">Products will appear here once the vendor starts adding them</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {vendorProducts[v.id].map((product) => (
                          <div key={product.id} className="bg-white rounded-lg border border-warm-border p-4 flex items-center gap-4">
                            {/* Product Image */}
                            <div className="w-16 h-16 rounded-lg bg-warm-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {product.images && product.images.length > 0 ? (
                                <img src={product.images[0].url} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-2xl">🛍️</span>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.title}</p>
                              <p className="text-xs text-gray-400 truncate mt-0.5">{product.description || "No description"}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-sm font-bold text-green-700">${product.price.toFixed(2)}</span>
                                {product.compare_at_price && (
                                  <span className="text-xs text-gray-400 line-through">${product.compare_at_price.toFixed(2)}</span>
                                )}
                                <span className="text-xs text-gray-400">&bull; {product.inventory_count} in stock</span>
                              </div>
                            </div>

                            {/* Product Status + Actions */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={`badge text-[10px] ${
                                product.status === "approved" ? "badge-success" :
                                product.status === "pending" ? "badge-warning" :
                                product.status === "rejected" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {product.status}
                              </span>
                              {product.status === "pending" && (
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleProductStatus(product.id, v.id, "approved")}
                                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all"
                                  >
                                    Allow
                                  </button>
                                  <button
                                    onClick={() => handleProductStatus(product.id, v.id, "rejected")}
                                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                              {product.status === "approved" && (
                                <button
                                  onClick={() => handleProductStatus(product.id, v.id, "rejected")}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all"
                                >
                                  Remove
                                </button>
                              )}
                              {product.status === "rejected" && (
                                <button
                                  onClick={() => handleProductStatus(product.id, v.id, "approved")}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all"
                                >
                                  Allow
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
