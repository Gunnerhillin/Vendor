import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { recoverReservedCheckout } from '@/lib/checkout'
import { dispatchNotifications } from '@/lib/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  // A deployment without a strong configured token must never accept requests.
  if (!secret || secret.length < 32 || /placeholder|your[_-]/i.test(secret)) return NextResponse.json({ error: 'Worker is not configured' }, { status: 503 })
  const digest = (value: string) => createHash('sha256').update(value).digest()
  if (!timingSafeEqual(digest(request.headers.get('authorization') || ''), digest(`Bearer ${secret}`))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.ENABLE_BACKGROUND_OPERATIONS !== 'true') return NextResponse.json({ error: 'Worker is disabled' }, { status: 503 })
  let checked = 0, failed = 0, recoveryAvailable = true
  try {
    const db = await createServiceRoleClient()
    const { data: orders, error } = await db.rpc('claim_checkout_recovery', { batch_size: 3 })
    if (error) throw new Error('Recovery queue unavailable')
    for (const order of orders || []) {
      try { await recoverReservedCheckout(order); checked++ } catch { failed++ }
    }
  } catch { recoveryAvailable = false }
  // Separate failures: an email outage must not block payment reconciliation.
  let notifications: { sent: number; failed: number; claimed: number } | null = null
  try { notifications = await dispatchNotifications() } catch {}
  const ok = recoveryAvailable && failed === 0 && notifications !== null && notifications.failed === 0
  return NextResponse.json({ ok, recovery: { available: recoveryAvailable, checked, failed }, notifications }, {
    status: ok ? 200 : 503, headers: { 'Cache-Control': 'private, no-store' },
  })
}
