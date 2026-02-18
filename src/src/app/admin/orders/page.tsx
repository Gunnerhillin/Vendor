const orders = [
  { id: "#ORD-8421", date: "Feb 16", customer: "Emily R.", vendor: "Haven Home", total: "$49.98", status: "shipped" },
  { id: "#ORD-8420", date: "Feb 16", customer: "Michael S.", vendor: "Luxe Thread", total: "$29.99", status: "processing" },
  { id: "#ORD-8419", date: "Feb 15", customer: "Sarah K.", vendor: "Glow Naturals", total: "$18.50", status: "delivered" },
  { id: "#ORD-8418", date: "Feb 15", customer: "Jamie L.", vendor: "Haven Home", total: "$39.99", status: "shipped" },
  { id: "#ORD-8417", date: "Feb 14", customer: "Priya M.", vendor: "Little Bloom", total: "$24.99", status: "delivered" },
  { id: "#ORD-8416", date: "Feb 14", customer: "Alex T.", vendor: "Oak & Stone", total: "$22.00", status: "delivered" },
]

export default function AdminOrdersPage() {
  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">All Orders</h1>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-warm-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                  <td className="px-6 py-4 text-sm font-medium">{o.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{o.date}</td>
                  <td className="px-6 py-4 text-sm">{o.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{o.vendor}</td>
                  <td className="px-6 py-4 text-sm font-medium">{o.total}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${o.status === "shipped" ? "badge-success" : o.status === "processing" ? "badge-warning" : "badge-info"}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
