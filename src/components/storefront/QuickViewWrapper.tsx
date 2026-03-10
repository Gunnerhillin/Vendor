'use client'

import { useQuickView } from '@/hooks/use-quick-view'
import QuickView from './QuickView'

export default function QuickViewWrapper() {
  const product = useQuickView((s) => s.product)
  const closeQuickView = useQuickView((s) => s.closeQuickView)

  return <QuickView product={product} onClose={closeQuickView} />
}
