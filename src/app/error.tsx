'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-warm-100 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-4">😵</p>
        <h1 className="font-display text-2xl font-bold mb-3">Something Went Wrong</h1>
        <p className="text-gray-500 mb-8">
          We hit an unexpected error. Our team has been notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn-primary">Try Again</button>
          <a href="/" className="btn-outline">Back to Home</a>
        </div>
      </div>
    </div>
  )
}
