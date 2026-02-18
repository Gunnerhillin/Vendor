import { DollarSign, Clock, CheckCircle2 } from "lucide-react"

const pendingPayouts: any[] = []

const recentPayouts: any[] = []

export default function AdminPayoutsPage() {
  const totalPending = pendingPayouts.reduce((sum, p) => sum + parseFloat(p.amount.replace(/[$,]/g, "")), 0)

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Payout Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Clock size={16} /> Pending</div>
          <p className="text-3xl font-bold">$0</p>
          <p className="text-xs text-gray-400 mt-1">0 vendors awaiting payout</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><CheckCircle2 size={16} /> Paid This Month</div>
          <p className="text-3xl font-bold">$0</p>
          <p className="text-xs text-gray-400 mt-1">0 payouts completed</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><DollarSign size={16} /> Next Batch</div>
          <p className="text-3xl font-bold">—</p>
          <p className="text-xs text-gray-400 mt-1">Bi-weekly payout schedule</p>
        </div>
      </div>

      {/* Pending */}
      <div className="card mb-8">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Pending Payouts</h2>
          <button className="btn-primary btn-sm">Trigger All Payouts</button>
        </div>
        {pendingPayouts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No pending payouts</p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Recent */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Recent Payouts</h2>
        </div>
        {recentPayouts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No recent payouts</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
