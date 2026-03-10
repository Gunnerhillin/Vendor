import { create } from 'zustand'
import type { Product } from '@/types'

interface QuickViewState {
  product: Product | null
  openQuickView: (product: Product) => void
  closeQuickView: () => void
}

export const useQuickView = create<QuickViewState>((set) => ({
  product: null,
  openQuickView: (product) => set({ product }),
  closeQuickView: () => set({ product: null }),
}))
