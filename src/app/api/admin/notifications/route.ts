import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { dispatchNotifications } from '@/lib/notifications'
export async function POST() {
  const db=await createServerSupabaseClient()
  const {data:{user}}=await db.auth.getUser()
  if(!user) return NextResponse.json({error:'Sign in required'},{status:401})
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single()
  if(profile?.role!=='admin') return NextResponse.json({error:'Admin access required'},{status:403})
  try { return NextResponse.json(await dispatchNotifications()) }
  catch { return NextResponse.json({error:'Email delivery is not ready. Check verified sender, email API configuration and database migrations.'},{status:503}) }
}
