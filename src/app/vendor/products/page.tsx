"use client"

import { assetUrl } from '@/lib/media'
import { useState, useEffect, useRef } from "react"
import { Plus, Search, Eye, Edit, Trash2, X, Upload, ImageIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"

interface ProductRow {
  id: string
  title: string
  slug: string
  description: string
  price: number
  compare_at_price: number | null
  status: string
  inventory_count: number
  sold_count: number
  category_id: string
  images: { id: string; url: string; alt: string | null; sort_order: number }[]
  category?: { name: string; slug: string }
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  icon: string
}

export default function VendorProductsPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState("")

  // Form fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [compareAtPrice, setCompareAtPrice] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [inventoryCount, setInventoryCount] = useState("0")
  const [imageFiles, setImageFiles] = useState<{ file?: File; preview: string; url?: string }[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Get vendor
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!vendor) { setLoading(false); return }
    setVendorId(vendor.id)

    // Fetch products
    const { data: prods } = await supabase
      .from("products")
      .select("*, images:product_images(id, url, alt, sort_order), category:categories(name, slug)")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false })

    if (prods) setProducts(prods as any)

    // Fetch categories
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, slug, icon")
      .order("sort_order")

    if (cats) setCategories(cats)
    setLoading(false)
  }

  const filtered = products
    .filter(p => filter === "all" || p.status === filter)
    .filter(p => !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const openAddModal = () => {
    setEditingProduct(null)
    setTitle("")
    setDescription("")
    setPrice("")
    setCompareAtPrice("")
    setCategoryId(categories[0]?.id || "")
    setInventoryCount("0")
    setImageFiles([])
    setModalError("")
    setShowModal(true)
  }

  const openEditModal = (product: ProductRow) => {
    setEditingProduct(product)
    setTitle(product.title)
    setDescription(product.description)
    setPrice(String(product.price))
    setCompareAtPrice(product.compare_at_price ? String(product.compare_at_price) : "")
    setCategoryId(product.category_id)
    setInventoryCount(String(product.inventory_count))
    setImageFiles(product.images?.map(img => ({ preview: img.url, url: img.url })) || [])
    setModalError("")
    setShowModal(true)
  }

  const handleImageUpload = (files: FileList) => {
    const newImages = Array.from(files).filter(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type)).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setImageFiles(prev => [...prev, ...newImages].slice(0, 8))
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => {
      const updated = [...prev]
      if (updated[index].file) URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const handleSave = async () => {
    if (!title.trim() || !price || !categoryId) {
      setModalError("Title, price, and category are required.")
      return
    }

    setSaving(true)
    setModalError("")

    try {
      // Upload new images to Supabase Storage
      const imageUrls: { url: string; alt: string }[] = []

      for (const img of imageFiles) {
        if (img.url) {
          // Existing image
          imageUrls.push({ url: img.url, alt: title })
        } else if (img.file) {
          // New upload
          const { data: { user } } = await supabase.auth.getUser()
          const ext = img.file.name.split(".").pop()
          const filePath = `products/${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

          const { error: uploadErr } = await supabase.storage
            .from("vendor-assets")
            .upload(filePath, img.file, { upsert: false })

          if (uploadErr) throw new Error("Unable to upload a product image. Please try again.")
          if (!uploadErr) {
            const { data: urlData } = supabase.storage
              .from("vendor-assets")
              .getPublicUrl(filePath)
            imageUrls.push({ url: assetUrl(filePath), alt: title })
          }
        }
      }

      const body = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
        category_id: categoryId,
        inventory_count: parseInt(inventoryCount) || 0,
        images: imageUrls,
      }

      if (editingProduct) {
        // Update
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to update product")
        }
      } else {
        // Create
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to create product")
        }
      }

      setShowModal(false)
      fetchData() // Refresh
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (productId: string, productTitle: string) => {
    if (!confirm(`Delete "${productTitle}"? This cannot be undone.`)) return

    const res = await fetch(`/api/products/${productId}`, { method: "DELETE" })
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== productId))
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
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
        <input
          type="text"
          placeholder="Search products..."
          className="input pl-11 max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No products found. Click "Add Product" to create your first listing.</p>
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
                        <div className="w-10 h-10 rounded-lg bg-warm-100 overflow-hidden flex-shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium">{p.title}</span>
                          {p.category && <p className="text-xs text-gray-400">{p.category.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{formatPrice(p.price)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={p.inventory_count < 10 ? "text-red-500 font-semibold" : ""}>{p.inventory_count}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">{p.sold_count}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        p.status === "approved" ? "badge-success" :
                        p.status === "pending" ? "badge-warning" :
                        p.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/products/${p.slug}`} className="p-2 hover:bg-warm-100 rounded-lg text-gray-400 hover:text-primary"><Eye size={16} /></Link>
                        <button onClick={() => openEditModal(p)} className="p-2 hover:bg-warm-100 rounded-lg text-gray-400 hover:text-primary"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(p.id, p.title)} className="p-2 hover:bg-warm-100 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-warm-border">
              <h2 className="font-display text-lg font-semibold">{editingProduct ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-warm-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              {modalError && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{modalError}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product name" className="input" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product..." className="input min-h-[100px] resize-y" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29.99" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compare at Price</label>
                  <input type="number" step="0.01" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} placeholder="49.99" className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
                    <option value="">Select category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Count</label>
                  <input type="number" min="0" value={inventoryCount} onChange={(e) => setInventoryCount(e.target.value)} className="input" />
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-warm-border rounded-xl p-6 text-center cursor-pointer hover:border-accent transition-colors"
                >
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to upload images (up to 8)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { if (e.target.files) handleImageUpload(e.target.files); e.target.value = "" }}
                  />
                </div>
                {imageFiles.length > 0 && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {imageFiles.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-warm-100">
                        <img src={img.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-warm-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
