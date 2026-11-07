"use client"

import { useEffect, useState } from "react"
import { DollarSign, Clock, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"

export default function AdminPayoutsPage() {
  const supabase = createClient()
  const [payouts, setPayouts] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPayouts() {
      const { data: payoutData } = await supabase
        .from("payouts")
        .select("*, vendor:vendors(business_name)")
        .order("created_at", { ascending: false })

      if (payoutData) setPayouts(payoutData)

      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id, business_name, total_revenue, status")
        .eq("status", "approved")

      if (vendorData) setVendors(vendorData)
      setLoading(false)
    }
    fetchPayouts()
  }, [])

  const pending = payouts.filter(p => p.status === "pending" && !p.reconciliation_required)
  const paid = payouts.filter(p => p.status === "paid")
  const totalPending = pending.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalPaid = paid.reduce((sum, p) => sum + Number(p.amount), 0)

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Payout Management</h1>
      <p className="mb-4 text-sm text-gray-600">Pending amounts are recorded earnings, not completed bank transfers. Refund-related payouts require reconciliation before release.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Clock size={16} /> Pending</div>
          <p className="text-3xl font-bold">{formatPrice(totalPending)}</p>
          <p className="text-xs text-gray-400 mt-1">{pending.length} vendors awaiting payout</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><CheckCircle2 size={16} /> Total Paid</div>
          <p className="text-3xl font-bold">{formatPrice(totalPaid)}</p>
          <p className="text-xs text-gray-400 mt-1">{paid.length} payouts completed</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><DollarSign size={16} /> Active Vendors</div>
          <p className="text-3xl font-bold">{vendors.length}</p>
          <p className="text-xs text-gray-400 mt-1">Approved vendors on platform</p>
        </div>
      </div>

      {/* All Payouts */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-warm-border">
          <h2 className="font-semibold">All Payouts</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No payouts yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-warm-border last:border-0">
                    <td className="px-6 py-4 text-sm font-medium">{p.vendor?.business_name || "—"}</td>
                    <td className="px-6 py-4 text-sm font-bold">{formatPrice(p.amount)}{p.reconciliation_required && <p className="text-xs text-red-700">Refund review required</p>}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(p.period_start)} — {formatDate(p.period_end)}</td>
                    <td className="px-6 py-4"><span className={`badge ${p.status === "paid" ? "badge-success" : p.status === "processing" ? "badge-warning" : "bg-gray-100 text-gray-600"}`}>{p.status}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.paid_at ? formatDate(p.paid_at) : formatDate(p.created_at)}</td>
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
