import { DollarSign, TrendingUp, Users, ShoppingCart, Download } from "lucide-react"

const monthlyData: any[] = []

export default function AdminRevenuePage() {
  const currentMonth = monthlyData[monthlyData.length - 1]

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Revenue Analytics</h1>
        <button className="btn-secondary btn-sm flex items-center gap-2">
          <Download size={14} /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><DollarSign size={14} /> Gross Merchandise Value</div>
          <p className="text-2xl font-bold">$0</p>
          <p className="text-xs text-gray-400 font-semibold mt-1">No data yet</p>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><TrendingUp size={14} /> Platform Commission</div>
          <p className="text-2xl font-bold">$0</p>
          <p className="text-xs text-gray-400 font-semibold mt-1">15% avg rate</p>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><ShoppingCart size={14} /> Total Orders</div>
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-gray-400 font-semibold mt-1">No orders yet</p>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><Users size={14} /> Active Vendors</div>
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-gray-400 font-semibold mt-1">No vendors yet</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Monthly Breakdown</h2>
        </div>
        {monthlyData.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No revenue data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Orders</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">GMV</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Commission</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Active Vendors</th>
                </tr>
              </thead>
              <tbody>
                {[...monthlyData].reverse().map((m) => (
                  <tr key={m.month} className="border-b border-warm-border last:border-0">
                    <td className="px-6 py-4 text-sm font-medium">{m.month}</td>
                    <td className="px-6 py-4 text-sm">{m.orders.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium">{m.gmv}</td>
                    <td className="px-6 py-4 text-sm font-bold text-accent-dark">{m.commission}</td>
                    <td className="px-6 py-4 text-sm">{m.vendors}</td>
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
