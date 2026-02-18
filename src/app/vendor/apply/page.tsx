"use client"

import { useState } from "react"
import Link from "next/link"
import { Store, Upload, ArrowRight, Check } from "lucide-react"

export default function VendorApplyPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 3) { setStep(step + 1); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); setSubmitted(true) }, 2000)
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
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-accent text-white' : 'bg-warm-border text-gray-400'}`}>
                {step > s ? <Check size={16} /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-accent' : 'bg-warm-border'}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg mb-4">Business Information</h2>
              <div>
                <label className="label">Business Name *</label>
                <input type="text" placeholder="Your Brand Name" className="input" required />
              </div>
              <div>
                <label className="label">Business Description *</label>
                <textarea placeholder="Tell us about your brand and what you sell..." className="input min-h-[120px] resize-y" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Primary Category *</label>
                  <select className="input">
                    <option>Select category</option>
                    <option>Clothing</option>
                    <option>Kids & Baby</option>
                    <option>Home Decor</option>
                    <option>Accessories</option>
                    <option>Health & Wellness</option>
                    <option>Men</option>
                    <option>Beauty</option>
                  </select>
                </div>
                <div>
                  <label className="label">Website (optional)</label>
                  <input type="url" placeholder="https://yourbrand.com" className="input" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg mb-4">Product Examples</h2>
              <p className="text-sm text-gray-500 mb-4">Upload a few photos of your products so we can review quality and fit.</p>
              <div className="border-2 border-dashed border-warm-border rounded-xl p-12 text-center hover:border-accent transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium">Drop product images here</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB each</p>
                <input type="file" multiple accept="image/*" className="hidden" />
              </div>
              <div>
                <label className="label">How many products do you plan to list?</label>
                <select className="input">
                  <option>1-10 products</option>
                  <option>11-50 products</option>
                  <option>51-200 products</option>
                  <option>200+ products</option>
                </select>
              </div>
              <div>
                <label className="label">Price Range</label>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Min price (e.g., $10)" className="input" />
                  <input type="text" placeholder="Max price (e.g., $100)" className="input" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg mb-4">Agreements</h2>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent" />
                  <span className="text-sm text-gray-600">I agree to the <a href="#" className="text-accent-dark underline">Platform Terms of Service</a></span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent" />
                  <span className="text-sm text-gray-600">I agree to the <a href="#" className="text-accent-dark underline">Commission Agreement</a> (15% platform fee on each sale)</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent" />
                  <span className="text-sm text-gray-600">I agree to the <a href="#" className="text-accent-dark underline">Quality Guidelines</a> and will maintain product standards</span>
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
              <button type="button" onClick={() => setStep(step - 1)} className="btn-ghost">
                &larr; Back
              </button>
            ) : <div />}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Submitting..." : step < 3 ? (
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
