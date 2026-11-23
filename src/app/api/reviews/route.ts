import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient,createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('id, product_id, customer_id, rating, comment, created_at, customer:public_profiles(full_name, avatar_url)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Reviews query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reviews: data || [] })
  } catch (error: any) {
    console.error('GET /api/reviews error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(request:NextRequest){return changeReview(request,false)}
export async function DELETE(request:NextRequest){return changeReview(request,true)}
async function changeReview(request:NextRequest,remove:boolean){
 try {
  const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser()
  if(!user?.email_confirmed_at)return NextResponse.json({error:'Sign in with a verified email'},{status:401})
  const body=await request.json()
  if(!remove && (!Number.isInteger(body.rating)||typeof (body.comment||'')!=='string'))return NextResponse.json({error:'Enter a whole-number rating and text review'},{status:400})
  const service=await createServiceRoleClient()
  const {data,error}=await service.rpc('save_verified_review',{customer_arg:user.id,product_arg:body.product_id,rating_arg:remove?null:body.rating,comment_arg:body.comment||null,remove_arg:remove})
  if(error)return NextResponse.json({error:error.code==='P0001'?error.message:'Unable to save this review'},{status:409})
  return NextResponse.json({review:data})
 }catch{return NextResponse.json({error:'Invalid review request'},{status:400})}
}
