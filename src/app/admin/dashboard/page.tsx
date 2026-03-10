"use client"

import { useEffect, useState } from "react"
import { DollarSign, Store, Package, Clock, ArrowUpRight, Download, FileText, Presentation, Globe, AlertTriangle, CheckCircle2, Circle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface VendorApp {
  id: string
  business_name: string
  slug: string
  description: string | null
  status: string
  applied_at: string
  user_id: string
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [pendingVendors, setPendingVendors] = useState<VendorApp[]>([])
  const [allVendors, setAllVendors] = useState<VendorApp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("*")
        .order("applied_at", { ascending: false })

      if (vendors) {
        setAllVendors(vendors)
        setPendingVendors(vendors.filter((v: VendorApp) => v.status === "pending"))
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleApprove = async (vendorId: string) => {
    const { error } = await supabase
      .from("vendors")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", vendorId)

    if (!error) {
      setPendingVendors(prev => prev.filter(v => v.id !== vendorId))
      setAllVendors(prev => prev.map(v => v.id === vendorId ? { ...v, status: "approved" } : v))
    }
  }

  const handleReject = async (vendorId: string) => {
    const { error } = await supabase
      .from("vendors")
      .update({ status: "rejected" })
      .eq("id", vendorId)

    if (!error) {
      setPendingVendors(prev => prev.filter(v => v.id !== vendorId))
      setAllVendors(prev => prev.map(v => v.id === vendorId ? { ...v, status: "rejected" } : v))
    }
  }

  const approvedCount = allVendors.filter(v => v.status === "approved").length

  const stats = [
    { label: "Platform Revenue (MTD)", value: "$0", change: "No data yet", icon: DollarSign, color: "bg-accent" },
    { label: "Active Vendors", value: String(approvedCount), change: `${pendingVendors.length} pending`, icon: Store, color: "bg-green-500" },
    { label: "Total Orders (MTD)", value: "0", change: "No orders yet", icon: Package, color: "bg-purple-500" },
    { label: "Pending Payouts", value: "$0", change: "No pending payouts", icon: Clock, color: "bg-amber-500" },
  ]

  const pendingProducts: any[] = []
  const payoutQueue: any[] = []
  const revenueData: any[] = []

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
  }

  return (
    <div className="max-w-7xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="card p-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 ${color}`} />
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Icon size={16} />
              {label}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight size={12} /> {change}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card mb-8">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Platform Revenue (Commission Earned)</h2>
          <button className="text-xs font-medium text-gray-500 border border-warm-border rounded-full px-4 py-1.5 hover:bg-warm-100">Export CSV</button>
        </div>
        {revenueData.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">No revenue data yet</p>
          </div>
        ) : (
          <div className="p-6 flex items-end gap-3 h-60">
            {revenueData.map(({ month, height }: any) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-gradient-to-t from-accent-light to-accent hover:opacity-80 transition-all" style={{ height: `${height}%` }} />
                <span className="text-xs text-gray-400">{month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Marketing Tools */}
      <div className="card mb-8">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <div>
            <h2 className="font-semibold">Marketing Tools</h2>
            <p className="text-xs text-gray-400 mt-1">Download resources for vendor outreach and launch</p>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent-dark">3 files</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-warm-border">
          <a
            href="/marketing/vender-vendor-pitch-deck.pptx"
            download
            className="flex items-center gap-4 p-5 hover:bg-warm-50 transition-colors group"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-orange-100 transition-colors">
              <Presentation size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">Vendor Pitch Deck</h4>
              <p className="text-xs text-gray-400">.pptx &bull; 245 KB</p>
            </div>
            <Download size={16} className="text-gray-300 group-hover:text-accent transition-colors" />
          </a>
          <a
            href="/marketing/vender-launch-checklist.docx"
            download
            className="flex items-center gap-4 p-5 hover:bg-warm-50 transition-colors group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">Launch Checklist</h4>
              <p className="text-xs text-gray-400">.docx &bull; 14 KB</p>
            </div>
            <Download size={16} className="text-gray-300 group-hover:text-accent transition-colors" />
          </a>
          <a
            href="/marketing/vendor-landing-page.html"
            download
            className="flex items-center gap-4 p-5 hover:bg-warm-50 transition-colors group"
          >
            <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-green-500 group-hover:bg-green-100 transition-colors">
              <Globe size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">Vendor Landing Page</h4>
              <p className="text-xs text-gray-400">.html &bull; 28 KB</p>
            </div>
            <Download size={16} className="text-gray-300 group-hover:text-accent transition-colors" />
          </a>
        </div>
      </div>

      {/* Launch Readiness — Placeholder Data Reminders */}
      <div className="card mb-8 border-2 border-amber-200">
        <div className="flex items-center justify-between p-6 border-b border-warm-border bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="font-semibold">Launch Readiness Checklist</h2>
              <p className="text-xs text-gray-400 mt-0.5">Replace placeholder data before going live</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">Action Required</span>
        </div>
        <div className="divide-y divide-warm-border">
          {[
            { done: false, label: "Configure EasyPost API key", detail: "Add EASYPOST_API_KEY to .env.local (get from easypost.com dashboard). Checkout will use fallback rates until configured." },
            { done: false, label: "Set up Stripe webhook secret", detail: "STRIPE_WEBHOOK_SECRET is still a placeholder. Create a webhook endpoint in Stripe Dashboard pointing to /api/webhooks/stripe." },
            { done: false, label: "Update warehouse/from address", detail: "src/lib/easypost.ts has DEFAULT_FROM_ADDRESS set to placeholder '123 Commerce St'. Update with your real fulfillment address." },
            { done: false, label: "Onboard first 3-5 vendors", detail: "Homepage shows placeholder products until real vendors list items. Recruit founding vendors to fill Trending & New Arrivals." },
            { done: false, label: "Replace placeholder products on homepage", detail: "page.tsx has PLACEHOLDER_PRODUCTS array — these auto-hide once real approved products exist in the database." },
            { done: false, label: "Feature a real vendor in Spotlight", detail: "VendorSpotlight shows 'Your Brand Here' placeholder. Approve a vendor and mark them as featured to replace it." },
            { done: false, label: "Update trust bar claims", detail: "Homepage trust bar says 'Free Shipping over $50' and '30-day returns'. Confirm these match your actual policies." },
            { done: false, label: "Wire up newsletter signup", detail: "Footer email form is visual only. Connect to Mailchimp, ConvertKit, or a Supabase table to capture leads." },
            { done: false, label: "Wire up Contact form", detail: "Contact page (/contact) has a form but submissions aren't emailed yet. Create /api/contact route or connect to support tool." },
            { done: false, label: "Add real OG image for social sharing", detail: "A generated placeholder OG image is at /public/og-image.png. Replace with a branded image (1200x630px)." },
            { done: false, label: "Set up Google Analytics / Vercel Analytics", detail: "No analytics are installed yet. Add tracking before launch to measure traffic and conversions." },
            { done: true, label: "Create About and Contact pages", detail: "About (/about) and Contact (/contact) pages are now live with placeholder content. Update with real company info." },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-6 py-4">
              <div className="pt-0.5">
                {item.done ? (
                  <CheckCircle2 size={18} className="text-green-500" />
                ) : (
                  <Circle size={18} className="text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-medium ${item.done ? 'line-through text-gray-400' : 'text-primary'}`}>{item.label}</h4>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Vendors */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-warm-border">
            <h2 className="font-semibold">Vendor Applications ({pendingVendors.length})</h2>
            <Link href="/admin/vendors" className="text-xs font-medium text-accent-dark hover:underline">View All</Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <p>Loading...</p>
            </div>
          ) : pendingVendors.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No pending vendor applications</p>
            </div>
          ) : (
            pendingVendors.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-5 py-4 border-b border-warm-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-xs font-bold">{getInitials(v.business_name)}</div>
                  <div>
                    <h4 className="text-sm font-medium">{v.business_name}</h4>
                    <p className="text-xs text-gray-400">Applied {timeAgo(v.applied_at)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(v.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(v.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pending Products */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-warm-border">
            <h2 className="font-semibold">Products Pending Review ({pendingProducts.length})</h2>
            <Link href="/admin/products" className="text-xs font-medium text-accent-dark hover:underline">View All</Link>
          </div>
          {pendingProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No products pending review</p>
            </div>
          ) : (
            pendingProducts.map((p: any) => (
              <div key={p.title} className="flex items-center justify-between px-5 py-4 border-b border-warm-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <h4 className="text-sm font-medium">{p.title}</h4>
                    <p className="text-xs text-gray-400">by {p.vendor} &bull; {p.time}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all">Approve</button>
                  <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all">Flag</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Top Vendors */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-warm-border">
            <h2 className="font-semibold">Top Vendors</h2>
            <Link href="/admin/vendors" className="text-xs font-medium text-accent-dark hover:underline">Manage All</Link>
          </div>
          {allVendors.filter(v => v.status === "approved").length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No vendors yet</p>
            </div>
          ) : (
            allVendors.filter(v => v.status === "approved").slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between px-5 py-4 border-b border-warm-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-xs font-bold">{getInitials(v.business_name)}</div>
                  <div>
                    <h4 className="text-sm font-medium">{v.business_name}</h4>
                    <p className="text-xs text-gray-400">$0 revenue &bull; 0 orders</p>
                  </div>
                </div>
                <span className="badge badge-success">approved</span>
              </div>
            ))
          )}
        </div>

        {/* Payout Queue */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-warm-border">
            <h2 className="font-semibold">Payout Queue</h2>
            <Link href="/admin/payouts" className="text-xs font-medium text-accent-dark hover:underline">Trigger All</Link>
          </div>
          {payoutQueue.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No pending payouts</p>
            </div>
          ) : (
            payoutQueue.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between px-5 py-4 border-b border-warm-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-xs font-bold">{p.initials}</div>
                  <div>
                    <h4 className="text-sm font-medium">{p.name}</h4>
                    <p className="text-xs text-gray-400">{p.orders} orders delivered &bull; Ready</p>
                  </div>
                </div>
                <span className="text-sm font-bold">{p.amount}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
