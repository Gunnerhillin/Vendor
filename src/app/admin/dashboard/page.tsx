import { DollarSign, Store, Package, Clock, ArrowUpRight } from "lucide-react"
import Link from "next/link"

const stats = [
  { label: "Platform Revenue (MTD)", value: "$0", change: "No data yet", icon: DollarSign, color: "bg-accent" },
  { label: "Active Vendors", value: "0", change: "No vendors yet", icon: Store, color: "bg-green-500" },
  { label: "Total Orders (MTD)", value: "0", change: "No orders yet", icon: Package, color: "bg-purple-500" },
  { label: "Pending Payouts", value: "$0", change: "No pending payouts", icon: Clock, color: "bg-amber-500" },
]

const pendingVendors: any[] = []

const pendingProducts: any[] = []

const topVendors: any[] = []

const payoutQueue: any[] = []

const revenueData: any[] = []

export default function AdminDashboard() {
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
            {revenueData.map(({ month, height }) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-gradient-to-t from-accent-light to-accent hover:opacity-80 transition-all" style={{ height: `${height}%` }} />
                <span className="text-xs text-gray-400">{month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Vendors */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-warm-border">
            <h2 className="font-semibold">Vendor Applications ({pendingVendors.length})</h2>
            <Link href="/admin/vendors" className="text-xs font-medium text-accent-dark hover:underline">View All</Link>
          </div>
          {pendingVendors.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No pending vendor applications</p>
            </div>
          ) : (
            pendingVendors.map((v) => (
              <div key={v.name} className="flex items-center justify-between px-5 py-4 border-b border-warm-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-xs font-bold">{v.initials}</div>
                  <div>
                    <h4 className="text-sm font-medium">{v.name}</h4>
                    <p className="text-xs text-gray-400">{v.category} &bull; Applied {v.time}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-all">Approve</button>
                  <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all">Reject</button>
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
            pendingProducts.map((p) => (
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
          {topVendors.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No vendors yet</p>
            </div>
          ) : (
            topVendors.map((v) => (
              <div key={v.name} className="flex items-center justify-between px-5 py-4 border-b border-warm-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-xs font-bold">{v.initials}</div>
                  <div>
                    <h4 className="text-sm font-medium">{v.name}</h4>
                    <p className="text-xs text-gray-400">{v.revenue} revenue &bull; {v.orders} orders</p>
                  </div>
                </div>
                <span className={`badge ${v.status === "active" ? "badge-success" : "badge-danger"}`}>{v.status}</span>
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
            payoutQueue.map((p) => (
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
