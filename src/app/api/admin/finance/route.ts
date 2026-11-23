import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient,createServiceRoleClient } from '@/lib/supabase/server'
import { executeFinancialOperation } from '@/lib/financial-operations'
export async function POST(request:NextRequest) {
  const db=await createServerSupabaseClient()
  const {data:{user}}=await db.auth.getUser()
  if(!user) return NextResponse.json({error:'Sign in required'},{status:401})
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single()
  if(profile?.role!=='admin') return NextResponse.json({error:'Admin access required'},{status:403})
  const key=process.env.STRIPE_SECRET_KEY || ''
  if((key.startsWith('sk_live_')||key.startsWith('rk_live_')) && process.env.ENABLE_LIVE_FINANCIAL_OPERATIONS!=='true') return NextResponse.json({error:'Live financial operations are not enabled.'},{status:503})
  let operation:any
  try {
    const body=await request.json()
    if(!['refund','transfer'].includes(body.kind)||!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(body.targetId||'')) return NextResponse.json({error:'Invalid operation'},{status:400})
    const {data,error}=await db.rpc('prepare_financial_operation',{kind_arg:body.kind,target_arg:body.targetId})
    if(error) return NextResponse.json({error:error.code==='P0001'?error.message:'Unable to prepare operation'},{status:409})
    operation=data
    if(operation.status==='succeeded') return NextResponse.json({status:'succeeded',kind:operation.kind,providerId:operation.provider_id})
    return NextResponse.json(await executeFinancialOperation(operation))
  } catch {
    if(operation?.id) {const service=await createServiceRoleClient();await service.from('financial_operations').update({last_error:'Provider result needs verification. Retry the same action to recover; do not issue a separate manual transaction.'}).eq('id',operation.id).eq('status','pending')}
    return NextResponse.json({error:'Not confirmed. Retry this same action to recover its existing operation. Older or failed operations require Stripe reconciliation; do not create a separate manual transaction.'},{status:409})
  }
}
