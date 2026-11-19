'use client'
import { useEffect } from 'react'
import { useCart } from '@/hooks/use-cart'
export default function CartHydration() {
  useEffect(() => { void useCart.persist.rehydrate() }, [])
  return null
}
