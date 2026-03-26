"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"
import { ChevronLeft, ChevronRight, X, Package } from "lucide-react"

function ImageGallery({ images, productTitle }: { images: { url: string }[], productTitle: string }) {
  const [expanded, setExpanded] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square rounded-lg bg-warm-100 flex flex-col items-center justify-center text-gray-300">
        <Package size={32} />
        <span className="text-xs mt-1">No images</span>
      </div>
    )
  }

  return (
    <>
      {/* Thumbnail grid */}
      <div className="space-y-2">
        <div
          className="w-full aspect-square rounded-lg bg-warm-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all"
          onClick={() => { setCurrentIndex(0); setExpanded(true) }}
        >
          <img src={images[0].url} alt={productTitle} className="w-full h-full object-cover" />
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-3 gap-1.5">
            {images.slice(1, 4).map((img, i) => (
              <div
                key={i}
                className="aspect-square rounded bg-warm-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all relative"
                onClick={() => { setCurrentIndex(i + 1); setExpanded(true) }}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                {i === 2 && images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                    +{images.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-400 text-center">{images.length} image{images.length !== 1 ? 's' : ''} — click to expand</p>
      </div>

      {/* Lightbox */}
      {expanded && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setExpanded(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors z-10"
            >
              <X size={24} />
            </button>
            <div className="relative rounded-xl overflow-hidden bg-black">
              <img
                src={images[currentIndex].url}
                alt={`${productTitle} - Image ${currentIndex + 1}`}
                className="w-full max-h-[80vh] object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentIndex((currentIndex - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentIndex((currentIndex + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            <div className="text-center text-white/60 text-sm mt-3">
              {currentIndex + 1} of {images.length}
            </div>
            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded cursor-pointer overflow-hidden border-2 transition-all ${i === currentIndex ? 'border-accent' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    onClick={() => setCurrentIndex(i)}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

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

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-50" />
          <p>No {filter === "all" ? "" : filter} products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              {/* Image section */}
              <div className="p-4 pb-2">
                <ImageGallery images={p.images} productTitle={p.title} />
              </div>

              {/* Product info */}
              <div className="p-4 pt-2 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm leading-tight">{p.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">by {p.vendor?.business_name || "Unknown Vendor"}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">{formatPrice(p.price)}</span>
                  <span className={`badge ${p.status === "approved" ? "badge-success" : p.status === "pending" ? "badge-warning" : p.status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                    {p.status}
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                )}

                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>{p.category?.name || "No category"}</span>
                  <span>{formatDate(p.created_at)}</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  {p.status === "pending" && (
                    <>
                      <button onClick={() => handleStatusChange(p.id, "approved")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all">
                        Approve
                      </button>
                      <button onClick={() => handleStatusChange(p.id, "rejected")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all">
                        Reject
                      </button>
                    </>
                  )}
                  {p.status === "approved" && (
                    <button onClick={() => handleStatusChange(p.id, "rejected")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all">
                      Remove Listing
                    </button>
                  )}
                  {p.status === "rejected" && (
                    <button onClick={() => handleStatusChange(p.id, "approved")} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all">
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
