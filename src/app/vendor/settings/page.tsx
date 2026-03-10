"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Upload, CreditCard, Check, ExternalLink, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function VendorSettingsPage() {
  const supabase = createClient()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [vendor, setVendor] = useState<any>(null)
  const [businessName, setBusinessName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeMessage, setStripeMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle Stripe Connect return
    const stripeParam = searchParams.get('stripe')
    if (stripeParam === 'complete') {
      setStripeMessage({ type: 'success', text: 'Stripe account connected successfully! You can now receive payouts.' })
    } else if (stripeParam === 'refresh') {
      setStripeMessage({ type: 'info', text: 'Stripe setup was interrupted. Click "Connect Stripe Account" to continue.' })
    }
  }, [searchParams])

  useEffect(() => {
    async function fetchVendor() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: v } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (v) {
        setVendor(v)
        setBusinessName(v.business_name || "")
        setSlug(v.slug || "")
        setDescription(v.description || "")
        setLogoUrl(v.logo_url)
        setBannerUrl(v.banner_url)

        // If stripe param is 'complete' and we have a stripe_account_id, mark onboarding done
        if (searchParams.get('stripe') === 'complete' && v.stripe_account_id && !v.stripe_onboarding_complete) {
          await supabase.from("vendors").update({ stripe_onboarding_complete: true }).eq("id", v.id)
          v.stripe_onboarding_complete = true
        }
      }
      setLoading(false)
    }
    fetchVendor()
  }, [])

  const handleImageUpload = async (file: File, type: "logo" | "banner") => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split(".").pop()
    const filePath = `vendor-${type}/${user.id}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from("vendor-assets")
      .upload(filePath, file, { upsert: true })

    if (!error) {
      const { data: urlData } = supabase.storage.from("vendor-assets").getPublicUrl(filePath)
      if (type === "logo") setLogoUrl(urlData.publicUrl)
      else setBannerUrl(urlData.publicUrl)
    }
  }

  const handleSave = async () => {
    if (!vendor) return
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from("vendors")
      .update({
        business_name: businessName.trim(),
        slug: slug.trim(),
        description: description.trim(),
        logo_url: logoUrl,
        banner_url: bannerUrl,
      })
      .eq("id", vendor.id)

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const handleStripeConnect = async () => {
    setStripeConnecting(true)
    try {
      const res = await fetch("/api/vendor/stripe-connect", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error(err)
    }
    setStripeConnecting(false)
  }

  if (loading) {
    return (
      <div className="max-w-3xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold mb-8">Store Settings</h1>

      {/* Brand Profile */}
      <div className="card p-6 md:p-8 mb-6">
        <h2 className="font-semibold text-lg mb-6">Brand Profile</h2>
        <div className="space-y-5">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center text-3xl font-display font-bold overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : businessName.charAt(0).toUpperCase() || "?"}
            </div>
            <button onClick={() => logoInputRef.current?.click()} className="btn-outline text-sm flex items-center gap-2"><Upload size={14} /> Upload Logo</button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], "logo") }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
            <div className="flex items-center">
              <span className="text-sm text-gray-400 bg-warm-100 px-4 py-3 rounded-l-lg border border-r-0 border-warm-border">vender.com/shop/</span>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="input rounded-l-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[100px] resize-y" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
            {bannerUrl ? (
              <div className="relative rounded-xl overflow-hidden h-40 mb-2">
                <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : null}
            <div onClick={() => bannerInputRef.current?.click()} className="border-2 border-dashed border-warm-border rounded-xl p-8 text-center hover:border-accent cursor-pointer transition-colors">
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Upload a banner image (1200 x 400px recommended)</p>
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], "banner") }} />
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="card p-6 md:p-8 mb-6">
        <h2 className="font-semibold text-lg mb-6 flex items-center gap-2">
          <CreditCard size={20} />
          Payment Settings
        </h2>
        {stripeMessage && (
          <div className={`rounded-lg p-4 mb-4 text-sm flex items-start gap-2 ${stripeMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {stripeMessage.type === 'success' ? <Check size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
            {stripeMessage.text}
          </div>
        )}
        <div className="bg-warm-100 rounded-lg p-6">
          <h3 className="font-medium mb-2">Stripe Connect</h3>
          {vendor?.stripe_onboarding_complete ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <Check size={16} /> Stripe account connected
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">Connect your Stripe account to receive payouts for your sales.</p>
              <button onClick={handleStripeConnect} disabled={stripeConnecting} className="btn-primary flex items-center gap-2">
                {stripeConnecting ? "Connecting..." : <><ExternalLink size={14} /> Connect Stripe Account</>}
              </button>
            </>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
        {saving ? "Saving..." : saved ? <><Check size={16} /> Saved!</> : "Save Changes"}
      </button>
    </div>
  )
}
