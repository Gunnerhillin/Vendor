'use client'

import { Package } from 'lucide-react'

export default function OrdersPage() {
  return (
    <div className="bg-white rounded-xl border border-warm-300 p-8">
      <h2 className="text-lg font-semibold text-primary mb-4">My Orders</h2>
      <div className="text-center py-12">
        <Package size={48} className="mx-auto text-warm-400 mb-4" />
        <p className="text-gray-500 font-medium">No orders yet</p>
        <p className="text-sm text-gray-400 mt-1">When you place orders, they&apos;ll appear here.</p>
      </div>
    </div>
  )
}
