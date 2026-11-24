import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { reviewOrderFinances } from '@/lib/financial-review'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  const db = await createServerSupabaseClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const orderId = request.nextUrl.searchParams.get('orderId') || ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) return NextResponse.json({ error: 'Enter the full order ID' }, { status: 400 })
  try {
    return NextResponse.json(await reviewOrderFinances(orderId), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to verify this order against Stripe. Check the payment mode, saved charge and provider access. No records were changed.' }, { status: 503 })
  }
}
