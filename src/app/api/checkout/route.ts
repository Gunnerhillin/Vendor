import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { startCheckout } from '@/lib/checkout'

export async function POST(request: NextRequest) {
  try {
    const db = await createServerSupabaseClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user?.email || !user.email_confirmed_at) return NextResponse.json({error:'Sign in with a verified email to checkout.'},{status:401})
    const raw=await request.text()
    if(raw.length>100000)return NextResponse.json({error:'Cart request is too large'},{status:413})
    const body=JSON.parse(raw)
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuid.test(body.checkoutKey || '') || !Array.isArray(body.items) || !body.items.length || body.items.length > 50) return NextResponse.json({error:'Invalid cart'},{status:400})
    if(body.items.some((item:any)=>!item || !uuid.test(item.product?.id||'') || (item.variant?.id && !uuid.test(item.variant.id)) || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>99)) return NextResponse.json({error:'Check product options and quantities'},{status:400})
    const cart = body.items.map((item: any) => ({product_id:item.product?.id,variant_id:item.variant?.id || null,quantity:item.quantity}))
      .sort((a: any,b: any) => `${a.product_id}:${a.variant_id}`.localeCompare(`${b.product_id}:${b.variant_id}`))
    const live = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') || process.env.STRIPE_SECRET_KEY?.startsWith('rk_live_') || false
    if (live && process.env.ENABLE_LIVE_CHECKOUT !== 'true') return NextResponse.json({error:'Checkout is not open for live payments yet.'},{status:503})
    const service = await createServiceRoleClient()
    const {data,error} = await service.rpc('reserve_checkout',{customer_arg:user.id,key_arg:body.checkoutKey,cart_arg:cart,email_arg:user.email,live_arg:live})
    if(error) return NextResponse.json({error:error.code==='P0001'?error.message:'Unable to reserve these items.'},{status:409})
    const url = await startCheckout(data.order,data.items)
    return NextResponse.json({url,orderId:data.order.id})
  } catch { return NextResponse.json({error:'Could not open checkout. Your cart is saved; retry to resume the same checkout.'},{status:503}) }
}
