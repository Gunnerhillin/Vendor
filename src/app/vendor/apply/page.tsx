"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Store, Upload, ArrowRight, Check, X, ImageIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function VendorApplyPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Step 1 fields
  const [businessName, setBusinessName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [website, setWebsite] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")

  // Step 2 fields
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [productCount, setProductCount] = useState("1-10 products")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")

  // Step 3 fields
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreeCommission, setAgreeCommission] = useState(false)
  const [agreeQuality, setAgreeQuality] = useState(false)

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(f => {
      if (!f.type.startsWith("image/")) return false
      if (f.size > 10 * 1024 * 1024) return false
      return true
    })

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setImages(prev => [...prev, ...newImages].slice(0, 6))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const removeImage = (index: number) => {
    setImages(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (step === 1) {
      if (!businessName.trim() || !description.trim() || !category) {
        setError("Please fill in all required fields.")
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      setStep(3)
      return
    }

    // Step 3 — submit application
    if (!agreeTerms || !agreeCommission || !agreeQuality) {
      setError("Please agree to all terms before submitting.")
      return
    }

    setLoading(true)

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("You must be logged in to apply. Please create an account first.")
        setLoading(false)
        return
      }

      // Check if user already has a pending/approved vendor application
      const { data: existingVendor } = await supabase
        .from("vendors")
        .select("id, status")
        .eq("user_id", user.id)
        .single()

      if (existingVendor) {
        if (existingVendor.status === "approved") {
          setError("You already have an approved vendor account!")
        } else if (existingVendor.status === "pending") {
          setError("You already have a pending application. We'll review it within 2-3 business days.")
        } else {
          setError("You already have an application on file. Please contact support.")
        }
        setLoading(false)
        return
      }

      // Upload product images to Supabase Storage
      const imageUrls: string[] = []
      for (const img of images) {
        const ext = img.file.name.split(".").pop()
        const filePath = `vendor-applications/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from("vendor-assets")
          .upload(filePath, img.file, { upsert: true })

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("vendor-assets")
            .getPublicUrl(filePath)
          imageUrls.push(urlData.publicUrl)
        }
      }

      // Create slug from business name
      const slug = businessName.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

      // Insert vendor record with pending status
      const { error: insertErr } = await supabase
        .from("vendors")
        .insert({
          user_id: user.id,
          business_name: businessName.trim(),
          slug,
          description: description.trim(),
          status: "pending",
          commission_rate: 0.25,
          stripe_onboarding_complete: false,
          total_sales: 0,
          total_revenue: 0,
          product_count: 0,
          applied_at: new Date().toISOString(),
          sample_images: imageUrls,
          city: city.trim() || null,
          state: state || null,
          is_local: city.toLowerCase().includes("saint george") || city.toLowerCase().includes("st. george") || city.toLowerCase().includes("st george"),
          offers_local_pickup: false,
        })

      if (insertErr) {
        setError("Something went wrong submitting your application. Please try again.")
        console.error(insertErr)
        setLoading(false)
        return
      }

      // Update user role to vendor (pending)
      await supabase
        .from("profiles")
        .update({ role: "vendor" })
        .eq("id", user.id)

      setSubmitted(true)
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col items-center justify-center px-4">
        <div className="card p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-6 flex items-center justify-center">
            <Check size={32} className="text-green-600" />
          </div>
          <h1 className="font-display text-2xl font-semibold mb-3">Application Submitted!</h1>
          <p className="text-gray-500 text-sm mb-8">
            We&apos;ll review your application within 2-3 business days. You&apos;ll receive an email once your store is approved.
          </p>
          <Link href="/" className="btn-primary">Back to Vender</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-100">
      <div className="p-6">
        <Link href="/" className="font-display text-2xl font-bold">V<span className="text-accent">ender</span></Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="text-center mb-10">
          <Store size={40} className="mx-auto text-accent mb-4" />
          <h1 className="font-display text-3xl font-semibold mb-2">Sell on Vender</h1>
          <p className="text-gray-500">Reach thousands of new customers. Simple setup, powerful tools.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[
            { num: 1, label: "Business Info" },
            { num: 2, label: "Products" },
            { num: 3, label: "Agreements" },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s.num ? 'bg-accent text-white' : 'bg-warm-border text-gray-400'}`}>
                  {step > s.num ? <Check size={16} /> : s.num}
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{s.label}</span>
              </div>
              {s.num < 3 && <div className={`w-12 h-0.5 mb-4 ${step > s.num ? 'bg-accent' : 'bg-warm-border'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg mb-4">Business Information</h2>
              <div>
                <label className="label">Business Name *</label>
                <input
                  type="text"
                  placeholder="Your Brand Name"
                  className="input"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Business Description *</label>
                <textarea
                  placeholder="Tell us about your brand and what you sell..."
                  className="input min-h-[120px] resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Primary Category *</label>
                  <select
                    className="input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">Select category</option>
                    <option value="clothing">Clothing</option>
                    <option value="kids-baby">Kids & Baby</option>
                    <option value="home-decor">Home Decor</option>
                    <option value="accessories">Accessories</option>
                    <option value="health-wellness">Health & Wellness</option>
                    <option value="men">Men</option>
                    <option value="beauty">Beauty</option>
                  </select>
                </div>
                <div>
                  <label className="label">Website (optional)</label>
                  <input
                    type="url"
                    placeholder="https://yourbrand.com"
                    className="input"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">City</label>
                  <input
                    type="text"
                    placeholder="e.g., Saint George"
                    className="input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">State</label>
                  <select
                    className="input"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    <option value="">Select state</option>
                    <option value="UT">Utah</option>
                    <option value="AZ">Arizona</option>
                    <option value="NV">Nevada</option>
                    <option value="CA">California</option>
                    <option value="CO">Colorado</option>
                    <option value="ID">Idaho</option>
                    <option value="NM">New Mexico</option>
                    <option value="WY">Wyoming</option>
                    <option value="OR">Oregon</option>
                    <option value="WA">Washington</option>
                    <option value="TX">Texas</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Local St. George vendors get a special badge!</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg mb-4">Product Examples</h2>
              <p className="text-sm text-gray-500 mb-4">Upload a few photos of your products so we can review quality and fit (up to 6 images).</p>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-accent bg-accent/5 scale-[1.01]"
                    : "border-warm-border hover:border-accent"
                }`}
              >
                <Upload size={32} className={`mx-auto mb-3 ${dragOver ? "text-accent" : "text-gray-400"}`} />
                <p className="text-sm font-medium">{dragOver ? "Drop images here!" : "Drop product images here"}</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB each — or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files)
                    e.target.value = ""
                  }}
                />
              </div>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-warm-100">
                      <img
                        src={img.preview}
                        alt={`Product ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/40 py-1 px-2">
                        <p className="text-white text-[10px] truncate">{img.file.name}</p>
                      </div>
                    </div>
                  ))}
                  {images.length < 6 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-warm-border flex flex-col items-center justify-center text-gray-400 hover:border-accent hover:text-accent transition-colors"
                    >
                      <ImageIcon size={24} />
                      <span className="text-xs mt-1">Add More</span>
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="label">How many products do you plan to list?</label>
                <select
                  className="input"
                  value={productCount}
                  onChange={(e) => setProductCount(e.target.value)}
                >
                  <option>1-10 products</option>
                  <option>11-50 products</option>
                  <option>51-200 products</option>
                  <option>200+ products</option>
                </select>
              </div>
              <div>
                <label className="label">Price Range</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Min price (e.g., $10)"
                    className="input"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Max price (e.g., $100)"
                    className="input"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg mb-4">Agreements</h2>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-gray-600">I agree to the <Link href="/terms" className="text-accent-dark underline">Platform Terms of Service</Link></span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeCommission}
                    onChange={(e) => setAgreeCommission(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-gray-600">I agree to the Commission Agreement (25% platform fee on each sale)</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeQuality}
                    onChange={(e) => setAgreeQuality(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-gray-600">I agree to the Quality Guidelines and will maintain product standards</span>
                </label>
              </div>
              <div className="bg-warm-100 rounded-lg p-4 mt-4">
                <h3 className="font-medium text-sm mb-2">What happens next?</h3>
                <ul className="text-xs text-gray-500 space-y-1.5">
                  <li>1. We review your application (2-3 business days)</li>
                  <li>2. If approved, you&apos;ll set up your Stripe account for payments</li>
                  <li>3. Upload your products and start selling!</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-warm-border">
            {step > 1 ? (
              <button type="button" onClick={() => { setStep(step - 1); setError("") }} className="btn-ghost">
                &larr; Back
              </button>
            ) : <div />}
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : step < 3 ? (
                <>Next <ArrowRight size={16} /></>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
