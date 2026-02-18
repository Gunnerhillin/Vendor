import { DollarSign, ArrowUpRight, Calendar, Clock } from "lucide-react"

const payouts: any[] = []

export default function VendorEarningsPage() {
  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Earnings & Payouts</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><DollarSign size={16} /> Total Earned</div>
          <p className="text-3xl font-bold">$0</p>
          <p className="text-xs text-gray-400 font-semibold mt-1">No earnings yet</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Clock size={16} /> Pending Payout</div>
          <p className="text-3xl font-bold">$0</p>
          <p className="text-xs text-gray-500 mt-1">No pending payouts</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Calendar size={16} /> Commission Rate</div>
          <p className="text-3xl font-bold">15%</p>
          <p className="text-xs text-gray-500 mt-1">Platform fee per sale</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Payout History</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No payout history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payout ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid On</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-warm-border last:border-0">
                    <td className="px-6 py-4 text-sm font-medium">{p.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.period}</td>
                    <td className="px-6 py-4 text-sm font-bold">{p.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${p.status === "paid" ? "badge-success" : "badge-warning"}`}>{p.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.date}</td>
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
