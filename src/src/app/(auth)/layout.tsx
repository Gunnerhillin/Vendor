import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-warm-100 flex flex-col">
      <div className="p-6">
        <Link href="/" className="font-display text-2xl font-bold">
          V<span className="text-accent">ender</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
