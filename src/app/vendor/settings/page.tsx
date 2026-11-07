"use client"

import { assetUrl } from '@/lib/media'
import { Suspense, useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Upload, CreditCard, Check, ExternalLink, AlertCircle, MapPin, Truck, RotateCcw, Copy, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function VendorSettingsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VendorSettingsContent />
    </Suspense>
  )
}

function VendorSettingsContent() {
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
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [offersPickup, setOffersPickup] = useState(false)
  const [pickupAddress, setPickupAddress] = useState("")
  const [pickupInstructions, setPickupInstructions] = useState("")
  const [offersFreeShipping, setOffersFreeShipping] = useState(false)
  const [freeShippingMinimum, setFreeShippingMinimum] = useState("")
  const [shippingPolicy, setShippingPolicy] = useState("")
  const [processingTime, setProcessingTime] = useState("1-3 business days")
  const [vendorReturnPolicy, setVendorReturnPolicy] = useState("")
  const [webhookToken, setWebhookToken] = useState("")
  const [tokenCopied, setTokenCopied] = useState(false)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeMessage, setStripeMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle Stripe Connect return
    const stripeParam = searchParams.get('stripe')
    if (stripeParam === 'complete') {
      setStripeMessage({ type: 'success', text: 'Stripe setup submitted. Payout eligibility will update after verification.' })
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
        setCity(v.city || "")
        setState(v.state || "")
        setOffersPickup(v.offers_local_pickup || false)
        setPickupAddress(v.pickup_address || "")
        setPickupInstructions(v.pickup_instructions || "")
        setOffersFreeShipping(v.offers_free_shipping || false)
        setFreeShippingMinimum(v.free_shipping_minimum ? String(v.free_shipping_minimum) : "")
        setShippingPolicy(v.shipping_policy || "")
        setProcessingTime(v.processing_time || "1-3 business days")
        setVendorReturnPolicy(v.return_policy || "")
        setWebhookToken(v.shipping_webhook_token || "")


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
      .upload(filePath, file, { upsert: false })

    if (!error) {
      const { data: urlData } = supabase.storage.from("vendor-assets").getPublicUrl(filePath)
      if (type === "logo") setLogoUrl(assetUrl(filePath))
      else setBannerUrl(assetUrl(filePath))
    }
  }

  const handleSave = async () => {
    if (!vendor) return
    setSaving(true)
    setSaved(false)

    const isLocal = city.toLowerCase().includes("saint george") || city.toLowerCase().includes("st. george") || city.toLowerCase().includes("st george")

    const { error } = await supabase
      .from("vendors")
      .update({
        business_name: businessName.trim(),
        slug: slug.trim(),
        description: description.trim(),
        logo_url: logoUrl,
        banner_url: bannerUrl,
        city: city.trim() || null,
        state: state || null,
        is_local: isLocal,
        offers_local_pickup: offersPickup,
        pickup_address: pickupAddress.trim() || null,
        pickup_instructions: pickupInstructions.trim() || null,
        offers_free_shipping: offersFreeShipping,
        free_shipping_minimum: freeShippingMinimum ? parseFloat(freeShippingMinimum) : null,
        shipping_policy: shippingPolicy.trim() || null,
        processing_time: processingTime || "1-3 business days",
        return_policy: vendorReturnPolicy.trim() || null,
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
              <span className="text-sm text-gray-400 bg-warm-100 px-4 py-3 rounded-l-lg border border-r-0 border-warm-border">cutievalley.com/shop/</span>
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

      {/* Location & Local Pickup */}
      <div className="card p-6 md:p-8 mb-6">
        <h2 className="font-semibold text-lg mb-6 flex items-center gap-2">
          <MapPin size={20} />
          Location & Local Pickup
        </h2>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Saint George" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select value={state} onChange={(e) => setState(e.target.value)} className="input">
                <option value="">Select state</option>
                <option value="UT">Utah</option>
                <option value="AZ">Arizona</option>
                <option value="NV">Nevada</option>
                <option value="CA">California</option>
                <option value="CO">Colorado</option>
                <option value="ID">Idaho</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {(city.toLowerCase().includes("saint george") || city.toLowerCase().includes("st. george") || city.toLowerCase().includes("st george")) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
              <MapPin size={18} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">Shop Local Badge</p>
                <p className="text-xs text-emerald-600">You&apos;ll receive a &ldquo;Shop Local&rdquo; badge on your products and store page!</p>
              </div>
            </div>
          )}

          <div className="border-t border-warm-border pt-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={offersPickup}
                onChange={(e) => setOffersPickup(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Offer Local Pickup</span>
                <p className="text-xs text-gray-400">Let customers pick up orders from your location</p>
              </div>
            </label>
          </div>

          {offersPickup && (
            <div className="space-y-4 pl-7">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
                <input type="text" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="e.g., 123 Main St, Saint George, UT 84770" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Instructions</label>
                <textarea value={pickupInstructions} onChange={(e) => setPickupInstructions(e.target.value)} placeholder="e.g., Text (435) 555-1234 when you arrive. Available Mon-Fri 10am-6pm." className="input min-h-[80px] resize-y" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shipping Settings */}
      <div className="card p-6 md:p-8 mb-6">
        <h2 className="font-semibold text-lg mb-6 flex items-center gap-2">
          <Truck size={20} />
          Shipping Settings
        </h2>
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">You handle your own shipping</p>
            <p className="text-xs text-blue-600">Use ShippingEasy or another platform to purchase labels. When labels are printed, tracking numbers will auto-populate into CutieValley via your webhook integration.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Processing Time</label>
            <select value={processingTime} onChange={(e) => setProcessingTime(e.target.value)} className="input">
              <option value="Same day">Same day</option>
              <option value="1 business day">1 business day</option>
              <option value="1-2 business days">1-2 business days</option>
              <option value="1-3 business days">1-3 business days</option>
              <option value="3-5 business days">3-5 business days</option>
              <option value="5-7 business days">5-7 business days</option>
            </select>
          </div>

          <div className="border-t border-warm-border pt-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={offersFreeShipping}
                onChange={(e) => setOffersFreeShipping(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Offer Free Shipping</span>
                <p className="text-xs text-gray-400">You cover shipping costs for your customers</p>
              </div>
            </label>
          </div>

          {offersFreeShipping && (
            <div className="pl-7">
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount (optional)</label>
              <div className="flex items-center">
                <span className="text-sm text-gray-400 bg-warm-100 px-3 py-3 rounded-l-lg border border-r-0 border-warm-border">$</span>
                <input
                  type="number"
                  value={freeShippingMinimum}
                  onChange={(e) => setFreeShippingMinimum(e.target.value)}
                  placeholder="0 (always free)"
                  min="0"
                  step="0.01"
                  className="input rounded-l-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Leave empty or 0 for free shipping on all orders</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Policy (optional)</label>
            <textarea
              value={shippingPolicy}
              onChange={(e) => setShippingPolicy(e.target.value)}
              placeholder="e.g., We ship via USPS Priority Mail within 1-3 business days. Tracking provided for all orders."
              className="input min-h-[80px] resize-y"
            />
          </div>
        </div>
      </div>

      {/* Return Policy */}
      <div className="card p-6 md:p-8 mb-6">
        <h2 className="font-semibold text-lg mb-6 flex items-center gap-2">
          <RotateCcw size={20} />
          Return Policy
        </h2>
        <div className="space-y-5">
          <div className="bg-warm-100 rounded-lg p-4 text-sm">
            <p className="font-medium text-gray-700 mb-1">Site-Wide Return Policy</p>
            <p className="text-xs text-gray-500">CutieValley has a site-wide return policy: items in returnable condition can be returned. You can add your own additional policy below. Customer service may override return decisions if a customer reaches out directly.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Return Policy (optional)</label>
            <textarea
              value={vendorReturnPolicy}
              onChange={(e) => setVendorReturnPolicy(e.target.value)}
              placeholder="e.g., Custom items are non-returnable. All other items can be returned within 14 days."
              className="input min-h-[80px] resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">This will be shown alongside the site-wide policy on your product pages</p>
          </div>
        </div>
      </div>

      {/* Shipping Integration */}
      <div className="card p-6 md:p-8 mb-6">
        <h2 className="font-semibold text-lg mb-6 flex items-center gap-2">
          <ExternalLink size={20} />
          Shipping Integration
        </h2>
        <div className="space-y-5">
          <p className="text-sm text-gray-500">Connect your shipping platform (ShippingEasy, ShipStation, Pirate Ship, etc.) to automatically push tracking numbers to CutieValley when you print labels.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={vendor ? `${window.location.origin}/api/vendor/shipping-webhook` : ''}
                className="input bg-warm-100 text-xs font-mono flex-1"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/vendor/shipping-webhook`)
                  setTokenCopied(true)
                  setTimeout(() => setTokenCopied(false), 2000)
                }}
                className="btn-outline text-xs flex items-center gap-1 whitespace-nowrap"
              >
                {tokenCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Token</label>
            {webhookToken ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookToken}
                  className="input bg-warm-100 text-xs font-mono flex-1"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookToken)
                    setTokenCopied(true)
                    setTimeout(() => setTokenCopied(false), 2000)
                  }}
                  className="btn-outline text-xs flex items-center gap-1 whitespace-nowrap"
                >
                  <Copy size={12} /> Copy
                </button>
                <button
                  onClick={async () => {
                    const token = crypto.randomUUID().replace(/-/g, '')
                    await supabase.from("vendors").update({ shipping_webhook_token: token }).eq("id", vendor.id)
                    setWebhookToken(token)
                  }}
                  className="btn-outline text-xs flex items-center gap-1 whitespace-nowrap text-amber-600 border-amber-300 hover:border-amber-500"
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  const token = crypto.randomUUID().replace(/-/g, '')
                  await supabase.from("vendors").update({ shipping_webhook_token: token }).eq("id", vendor.id)
                  setWebhookToken(token)
                }}
                className="btn-primary text-sm"
              >
                Generate API Token
              </button>
            )}
            <p className="text-xs text-gray-400 mt-2">Use this token as a Bearer token in your shipping platform&apos;s webhook configuration. Include it in the Authorization header.</p>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
        {saving ? "Saving..." : saved ? <><Check size={16} /> Saved!</> : "Save Changes"}
      </button>
    </div>
  )
}
