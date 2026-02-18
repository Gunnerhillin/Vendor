import { TrendingUp, Package, ShoppingCart, DollarSign, ArrowUpRight } from "lucide-react"

const stats = [
  { label: "Total Revenue", value: "$0", change: "No data yet", up: true, icon: DollarSign },
  { label: "Orders This Month", value: "0", change: "No orders yet", up: true, icon: ShoppingCart },
  { label: "Active Products", value: "0", change: "No products yet", up: true, icon: Package },
  { label: "Next Payout", value: "$0", change: "No payouts yet", up: true, icon: TrendingUp },
]

const recentOrders: any[] = []

const revenueData: any[] = []

export default function VendorDashboard() {
  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Vendor Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, change, up, icon: Icon }) => (
          <div key={label} className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{label}</span>
              <Icon size={18} className="text-accent" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${up ? "text-green-600" : "text-red-500"}`}>
              {up && <ArrowUpRight size={12} />}
              {change}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card mb-8">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Revenue Overview</h2>
          <button className="text-xs font-medium text-gray-500 border border-warm-border rounded-full px-4 py-1.5 hover:bg-warm-100">
            Last 6 Months
          </button>
        </div>
        {revenueData.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No revenue data yet</p>
          </div>
        ) : (
          <div className="p-6 flex items-end gap-3 h-60">
            {revenueData.map(({ month, height }) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-md transition-all hover:opacity-80 ${month === "Feb" ? "bg-accent" : "bg-accent-light"}`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-400">{month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">Recent Orders</h2>
          <button className="text-xs font-medium text-accent-dark hover:underline">View All</button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4 text-sm font-medium">{order.id}</td>
                    <td className="px-6 py-4 text-sm">{order.product}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{order.customer}</td>
                    <td className="px-6 py-4 text-sm font-medium">{order.total}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === "Shipped" ? "bg-green-50 text-green-700" :
                        order.status === "Processing" ? "bg-yellow-50 text-yellow-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          order.status === "Shipped" ? "bg-green-500" :
                          order.status === "Processing" ? "bg-yellow-500" :
                          "bg-blue-500"
                        }`} />
                        {order.status}
                      </span>
                    </td>
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
