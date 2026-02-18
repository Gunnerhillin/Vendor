const orders: any[] = []

const statusStyles: Record<string, string> = {
  shipped: "badge-success",
  processing: "badge-warning",
  delivered: "badge-info",
  pending: "bg-gray-100 text-gray-600",
}

export default function VendorOrdersPage() {
  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Orders</h1>

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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-warm-border last:border-0 hover:bg-warm-100/50">
                    <td className="px-6 py-4 text-sm font-medium">{o.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{o.date}</td>
                    <td className="px-6 py-4 text-sm">{o.product}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{o.customer}</td>
                    <td className="px-6 py-4 text-sm font-medium">{o.total}</td>
                    <td className="px-6 py-4"><span className={`badge capitalize ${statusStyles[o.status]}`}>{o.status}</span></td>
                    <td className="px-6 py-4 text-right">
                      {o.status === "processing" && (
                        <button className="text-xs font-semibold text-accent-dark hover:underline">Mark Shipped</button>
                      )}
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
