'use client'

import Link from 'next/link'

export default function ProductDetailPage() {
  return (
    <div className="page-container py-16 text-center">
      <h1 className="font-display text-2xl font-semibold mb-4">Product Not Found</h1>
      <p className="text-gray-400 mb-6">This product is not available yet.</p>
      <Link href="/" className="btn-primary">
        Back to Home
      </Link>
    </div>
  )
}
