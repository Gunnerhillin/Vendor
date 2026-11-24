import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { serviceReadiness } from '@/lib/service-readiness'
export const dynamic = 'force-dynamic'
export async function GET() {
  const db = await createServerSupabaseClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  return NextResponse.json(serviceReadiness(process.env), { headers: { 'Cache-Control': 'private, no-store' } })
}
