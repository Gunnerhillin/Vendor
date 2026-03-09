"use client"

import { useEffect, useState } from "react"
import { DollarSign, Clock, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils"

export default function VendorEarningsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [totalEarned, setTotalEarned] = useState(0)
  const [pendingPayout, setPendingPayout] = useState(0)
  const [commissionRate, setCommissionRate] = useState(0.25)
  const [payouts, setPayouts] = useState<any[]>([])

  useEffect(() => {
    async function fetchEarnings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: vendor } = await supabase
        .from("vendors")
        .select("id, total_revenue, commission_rate")
        .eq("user_id", user.id)
        .single()

      if (!vendor) return
      setTotalEarned(vendor.total_revenue || 0)
      setCommissionRate(vendor.commission_rate || 0.25)

      // Payouts
      const { data: payoutData } = await supabase
        .from("payouts")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })

      if (payoutData) {
        setPayouts(payoutData)
        const pending = payoutData.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0)
        setPendingPayout(pending)
      }

      setLoading(false)
    }
    fetchEarnings()
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Earnings & Payouts</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><DollarSign size={16} /> Total Earned</div>
          <p className="text-3xl font-bold">{formatPrice(totalEarned)}</p>
          <p className="text-xs text-gray-400 font-semibold mt-1">After platform commission</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Clock size={16} /> Pending Payout</div>
          <p className="text-3xl font-bold">{formatPrice(pendingPayout)}</p>
          <p className="text-xs text-gray-500 mt-1">{payouts.filter(p => p.status === "pending").length} pending payouts</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Calendar size={16} /> Commission Rate</div>
          <p className="text-3xl font-bold">{Math.round(commissionRate * 100)}%</p>
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
                    <td className="px-6 py-4 text-sm font-medium">#{p.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(p.period_start)} — {formatDate(p.period_end)}</td>
                    <td className="px-6 py-4 text-sm font-bold">{formatPrice(p.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${p.status === "paid" ? "badge-success" : p.status === "processing" ? "badge-warning" : "bg-gray-100 text-gray-600"}`}>{p.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.paid_at ? formatDate(p.paid_at) : "—"}</td>
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
