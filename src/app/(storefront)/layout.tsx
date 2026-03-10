'use client'

import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import CartDrawer from '@/components/shared/CartDrawer'
import { ToastProvider } from '@/components/shared/Toast'
import BackToTop from '@/components/shared/BackToTop'
import QuickViewWrapper from '@/components/storefront/QuickViewWrapper'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Header />
      <CartDrawer />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <BackToTop />
      <QuickViewWrapper />
    </ToastProvider>
  )
}
