"use client"

import { Upload, CreditCard } from "lucide-react"

export default function VendorSettingsPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold mb-8">Store Settings</h1>

      {/* Brand Profile */}
      <div className="card p-6 md:p-8 mb-6">
        <h2 className="font-semibold text-lg mb-6">Brand Profile</h2>
        <div className="space-y-5">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center text-3xl font-display font-bold">H</div>
            <button className="btn-secondary btn-sm"><Upload size={14} /> Upload Logo</button>
          </div>
          <div>
            <label className="label">Business Name</label>
            <input type="text" defaultValue="Haven Home Co." className="input" />
          </div>
          <div>
            <label className="label">Store URL</label>
            <div className="flex items-center">
              <span className="text-sm text-gray-400 bg-warm-100 px-4 py-3 rounded-l-lg border border-r-0 border-warm-border">vender.com/shop/</span>
              <input type="text" defaultValue="haven-home-co" className="input rounded-l-none" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea defaultValue="Handmade home goods crafted with intention." className="input min-h-[100px] resize-y" />
          </div>
          <div>
            <label className="label">Banner Image</label>
            <div className="border-2 border-dashed border-warm-border rounded-xl p-8 text-center hover:border-accent cursor-pointer transition-colors">
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Upload a banner image (1200 x 400px recommended)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="card p-6 md:p-8 mb-6">
        <h2 className="font-semibold text-lg mb-6 flex items-center gap-2">
          <CreditCard size={20} />
          Payment Settings
        </h2>
        <div className="bg-warm-100 rounded-lg p-6">
          <h3 className="font-medium mb-2">Stripe Connect</h3>
          <p className="text-sm text-gray-500 mb-4">Connect your Stripe account to receive bi-weekly payouts.</p>
          <button className="btn-primary btn-sm">Connect Stripe Account</button>
        </div>
      </div>

      <button className="btn-primary">Save Changes</button>
    </div>
  )
}
