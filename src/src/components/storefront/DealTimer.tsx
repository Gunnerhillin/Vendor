'use client'

import { useState, useEffect } from 'react'

interface DealTimerProps {
  endsAt?: string
  label?: string
}

export default function DealTimer({ endsAt, label = 'Flash Sale' }: DealTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const endTime = endsAt ? new Date(endsAt).getTime() : Date.now() + 8 * 60 * 60 * 1000

    const tick = () => {
      const diff = Math.max(0, endTime - Date.now())
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="bg-white border-b border-warm-border py-3 px-4 flex items-center justify-center gap-4 md:gap-6 flex-wrap">
      <span className="text-xs font-bold text-red-500 uppercase tracking-wider">{label}</span>
      <div className="flex gap-2">
        {[
          { val: timeLeft.hours, label: 'hrs' },
          { val: timeLeft.minutes, label: 'min' },
          { val: timeLeft.seconds, label: 'sec' },
        ].map((t) => (
          <div key={t.label} className="bg-primary text-white px-3 py-1.5 rounded-md text-center min-w-[48px]">
            <span className="text-lg font-bold leading-none">{pad(t.val)}</span>
            <span className="block text-[9px] uppercase tracking-wider opacity-70 mt-0.5">{t.label}</span>
          </div>
        ))}
      </div>
      <span className="text-sm text-gray-500 hidden sm:block">Up to 75% off — limited quantities</span>
    </div>
  )
}
