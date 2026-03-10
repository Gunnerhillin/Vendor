'use client'

{/* ADMIN REMINDER: Wire this form to send emails via Resend, or replace with a support tool like Intercom/Zendesk */}

import { useState } from 'react'
import { Mail, MapPin, Clock, Send, Check } from 'lucide-react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send message')
      }

      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-warm-100 via-warm-200 to-accent-light py-16 md:py-20">
        <div className="section-padding text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-lg text-gray-600">Have a question, feedback, or want to partner with us? We&apos;d love to hear from you.</p>
        </div>
      </div>

      <div className="section-padding py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-5xl mx-auto">

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-xl font-semibold mb-6">Contact Info</h2>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Email</p>
                    {/* ADMIN REMINDER: Replace with real support email */}
                    <a href="mailto:support@vender.com" className="text-sm text-accent-dark hover:underline">support@vender.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Response Time</p>
                    <p className="text-sm text-gray-500">We typically respond within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Location</p>
                    {/* ADMIN REMINDER: Replace with real business location */}
                    <p className="text-sm text-gray-500">United States</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-5 bg-warm-100/50">
              <p className="text-xs font-bold text-accent-dark uppercase tracking-widest mb-2">For Vendors</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Interested in selling on Vender? Visit our{' '}
                <a href="/marketing/vendor-landing-page.html" className="text-accent-dark font-medium hover:underline">vendor page</a>{' '}
                to learn more and apply.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <Check size={32} className="text-green-600" />
                </div>
                <h2 className="font-display text-xl font-semibold mb-3">Message Sent!</h2>
                <p className="text-gray-500">Thanks for reaching out. We&apos;ll get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card p-6 md:p-8">
                <h2 className="font-display text-xl font-semibold mb-6">Send a Message</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        className="input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select
                      className="input"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    >
                      <option value="">Select a topic</option>
                      <option value="order">Order Issue</option>
                      <option value="product">Product Question</option>
                      <option value="vendor">Vendor Inquiry</option>
                      <option value="partnership">Partnership</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      className="input min-h-[150px] resize-y"
                      placeholder="Tell us how we can help..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full md:w-auto"
                  >
                    {loading ? (
                      'Sending...'
                    ) : (
                      <>
                        Send Message
                        <Send size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
