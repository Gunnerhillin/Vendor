'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSent(true)
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="card p-8 md:p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <Check size={32} className="text-green-600" />
        </div>
        <h1 className="font-display text-2xl font-semibold mb-3">Check Your Email</h1>
        <p className="text-sm text-gray-500 mb-6">
          We sent a password reset link to <strong className="text-primary">{email}</strong>.
          Click the link in the email to set a new password.
        </p>
        <p className="text-xs text-gray-400 mb-6">Didn&apos;t receive it? Check your spam folder or try again.</p>
        <button onClick={() => setSent(false)} className="text-sm text-accent-dark font-semibold hover:underline">
          Try a different email
        </button>
      </div>
    )
  }

  return (
    <div className="card p-8 md:p-10">
      <Link href="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-accent-dark mb-6">
        <ArrowLeft size={14} /> Back to sign in
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold mb-2">Reset Your Password</h1>
        <p className="text-sm text-gray-500">Enter your email and we&apos;ll send you a link to reset your password.</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg mb-4 text-sm bg-red-50 text-red-600 border border-red-200">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input pl-11"
              required
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  )
}
