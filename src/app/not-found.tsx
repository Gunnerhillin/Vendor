import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-warm-100 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-display font-bold text-accent/30 mb-4">404</p>
        <h1 className="font-display text-2xl font-bold mb-3">Page Not Found</h1>
        <p className="text-gray-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">Back to Home</Link>
          <Link href="/search" className="btn-outline">Search Products</Link>
        </div>
      </div>
    </div>
  )
}
