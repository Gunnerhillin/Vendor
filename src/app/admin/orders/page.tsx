const orders: any[] = []

export default function AdminOrdersPage() {
  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">All Orders</h1>
      <div className="card">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No orders yet</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
