import { DollarSign, Clock, CheckCircle2 } from "lucide-react"

const pendingPayouts = [
  { vendor: "Luxe Thread Co.", initials: "LT", orders: 14, amount: "$1,840" },
  { vendor: "Haven Home Co.", initials: "HH", orders: 11, amount: "$2,340" },
  { vendor: "Glow Naturals", initials: "GN", orders: 8, amount: "$1,420" },
  { vendor: "Little Bloom Kids", initials: "LB", orders: 6, amount: "$980" },
  { vendor: "Oak & Stone Apparel", initials: "OS", orders: 5, amount: "$720" },
]

const recentPayouts = [
  { vendor: "Luxe Thread Co.", amount: "$1,640", date: "Feb 14, 2026", status: "paid" },
  { vendor: "Haven Home Co.", amount: "$1,890", date: "Feb 14, 2026", status: "paid" },
  { vendor: "Glow Naturals", amount: "$1,320", date: "Feb 14, 2026", status: "paid" },
  { vendor: "Aria Boutique", amount: "$980", date: "Feb 14, 2026", status: "paid" },
]

export default function AdminPayoutsPage() {
  const totalPending = pendingPayouts.reduce((sum, p) => sum + parseFloat(p.amount.replace(/[$,]/g, "")), 0)

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Payout Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Clock size={16} /> Pending</div>
          <p className="text-3xl font-bold">${totalPending.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{pendingPayouts.length} vendors awaiting payout</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><CheckCircle2 size={16} /> Paid This Month</div>
          <p className="text-3xl font-bold">$5,830</p>
          <p className="text-xs text-gray-400 mt-1">4 payouts completed</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><DollarSign size={16} /> Next Batch</div>
          <p className="text-3xl font-bold">Feb 28</p>
          <p className="text-xs text-gray-400 mt-1">Bi-weekly payout schedule</p>
        </div>
      </div>

      {/* Pending */}
      <div className="card mb-8">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Pending Payouts</h2>
          <button className="btn-primary btn-sm">Trigger All Payouts</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-warm-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Delivered Orders</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayouts.map((p) => (
                <tr key={p.vendor} className="border-b border-warm-border last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center text-xs font-bold">{p.initials}</div>
                      <span className="text-sm font-medium">{p.vendor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{p.orders} orders</td>
                  <td className="px-6 py-4 text-sm font-bold">{p.amount}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-4 py-1.5 rounded-full text-xs font-semibold bg-accent text-white hover:bg-accent-dark transition-all">
                      Send Payout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Recent Payouts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-warm-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayouts.map((p) => (
                <tr key={p.vendor} className="border-b border-warm-border last:border-0">
                  <td className="px-6 py-4 text-sm font-medium">{p.vendor}</td>
                  <td className="px-6 py-4 text-sm font-bold">{p.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.date}</td>
                  <td className="px-6 py-4"><span className="badge badge-success">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
