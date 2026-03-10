'use client'

import { MapPin } from 'lucide-react'

interface LocalBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
  city?: string | null
  state?: string | null
}

export default function LocalBadge({ size = 'md', className = '', showText = true, city, state }: LocalBadgeProps) {
  const sizes = {
    sm: { icon: 12, text: 'text-[10px]', padding: 'px-1.5 py-0.5', gap: 'gap-0.5' },
    md: { icon: 14, text: 'text-xs', padding: 'px-2 py-1', gap: 'gap-1' },
    lg: { icon: 16, text: 'text-sm', padding: 'px-3 py-1.5', gap: 'gap-1.5' },
  }

  const s = sizes[size]
  const location = city && state ? `${city}, ${state}` : city || state || 'St. George, UT'

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.padding} rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold ${s.text} ${className}`}
      title={`Local vendor from ${location}`}
    >
      <MapPin size={s.icon} className="text-emerald-600" />
      {showText && <span>Shop Local</span>}
    </span>
  )
}

export function LocalPickupBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs ${className}`}>
      <MapPin size={14} className="text-blue-600" />
      <span>Local Pickup Available</span>
    </span>
  )
}
