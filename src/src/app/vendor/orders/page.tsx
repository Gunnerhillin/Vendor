const orders = [
  { id: "#VND-4821", date: "Feb 15, 2026", product: "Soy Candle Set (x2)", customer: "Emily R.", total: "$49.98", status: "shipped" },
  { id: "#VND-4820", date: "Feb 14, 2026", product: "Woven Throw Blanket", customer: "Michael S.", total: "$39.99", status: "processing" },
  { id: "#VND-4819", date: "Feb 13, 2026", product: "Ceramic Planter Duo", customer: "Sarah K.", total: "$18.99", status: "delivered" },
  { id: "#VND-4818", date: "Feb 12, 2026", product: "Wall Art Print Set", customer: "Jamie L.", total: "$29.99", status: "shipped" },
  { id: "#VND-4817", date: "Feb 11, 2026", product: "Soy Candle Set", customer: "Priya M.", total: "$24.99", status: "delivered" },
  { id: "#VND-4816", date: "Feb 10, 2026", product: "Macrame Plant Hanger (x3)", customer: "Alex T.", total: "$50.97", status: "delivered" },
]

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
      </div>
    </div>
  )
}
