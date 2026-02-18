import { create } from 'zustand'
import type { Product, ProductVariant, CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (product: Product, variant: ProductVariant | null, quantity?: number) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,

  addItem: (product, variant, quantity = 1) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.product.id === product.id && i.variant?.id === variant?.id
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id && i.variant?.id === variant?.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        }
      }
      return { items: [...state.items, { product, variant, quantity }] }
    })
  },

  removeItem: (productId, variantId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.product.id === productId && i.variant?.id === variantId)
      ),
    }))
  },

  updateQuantity: (productId, variantId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId, variantId)
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId && i.variant?.id === variantId
          ? { ...i, quantity }
          : i
      ),
    }))
  },

  clearCart: () => set({ items: [] }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  total: () => {
    return get().items.reduce((sum, item) => {
      const price = item.product.price + (item.variant?.price_adjustment || 0)
      return sum + price * item.quantity
    }, 0)
  },

  itemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0)
  },
}))
