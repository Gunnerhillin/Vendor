'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

interface DayData {
  date: string
  label: string
  revenue: number
  orders: number
}

export default function SalesChart({ vendorId }: { vendorId: string }) {
  const [data, setData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d'>('7d')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()
      const days = period === '7d' ? 7 : 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, unit_price, created_at')
        .eq('vendor_id', vendorId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      // Group by day
      const dayMap = new Map<string, { revenue: number; orders: number }>()

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (days - 1 - i))
        const key = d.toISOString().split('T')[0]
        dayMap.set(key, { revenue: 0, orders: 0 })
      }

      // Fill in data
      items?.forEach(item => {
        const key = new Date(item.created_at).toISOString().split('T')[0]
        const existing = dayMap.get(key) || { revenue: 0, orders: 0 }
        existing.revenue += item.unit_price * item.quantity
        existing.orders += 1
        dayMap.set(key, existing)
      })

      const result: DayData[] = []
      dayMap.forEach((val, key) => {
        const d = new Date(key + 'T12:00:00')
        result.push({
          date: key,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: Math.round(val.revenue * 100) / 100,
          orders: val.orders,
        })
      })

      setData(result)
      setLoading(false)
    }

    if (vendorId) fetchData()
  }, [vendorId, period])

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0)

  return (
    <div className="card">
      <div className="flex items-center justify-between p-6 border-b border-warm-border">
        <div>
          <h2 className="font-semibold">Sales Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatPrice(totalRevenue)} revenue &middot; {totalOrders} orders
          </p>
        </div>
        <div className="flex gap-1 bg-warm-100 rounded-lg p-1">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === '7d' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-primary'}`}
          >
            7 days
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === '30d' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-primary'}`}
          >
            30 days
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex items-end gap-1 h-48">
            {data.map((d, i) => {
              const height = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0
              const showLabel = period === '7d' || i % 5 === 0 || i === data.length - 1

              return (
                <div key={d.date} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-primary text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <p className="font-semibold">{d.label}</p>
                    <p>{formatPrice(d.revenue)}</p>
                    <p>{d.orders} order{d.orders !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Bar */}
                  <div
                    className="w-full rounded-t-sm bg-gradient-to-t from-accent to-accent-light transition-all duration-500 hover:from-accent-dark hover:to-accent cursor-pointer"
                    style={{ height: `${Math.max(height, 2)}%`, minHeight: '2px' }}
                  />

                  {/* Label */}
                  {showLabel && (
                    <span className="text-[9px] text-gray-400 mt-2 whitespace-nowrap">
                      {d.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
