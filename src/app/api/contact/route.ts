import {NextRequest,NextResponse} from 'next/server'
import {createServiceRoleClient} from '@/lib/supabase/server'
export async function POST(request:NextRequest){
 try {
  if(Number(request.headers.get('content-length')||0)>20000)return NextResponse.json({error:'Message is too large'},{status:413})
  const raw=await request.text()
  if(raw.length>20000)return NextResponse.json({error:'Message is too large'},{status:413})
  const body=JSON.parse(raw)
  if(body.website)return NextResponse.json({success:true,message:'Received'})
  if(typeof body.email!=='string')return NextResponse.json({error:'Enter a valid email address'},{status:400})
  const db=await createServiceRoleClient()
  const {error}=await db.rpc('capture_public_message',{kind_arg:'contact',email_arg:body.email,name_arg:body.name||null,subject_arg:body.subject||null,message_arg:body.message||null})
  if(error)return NextResponse.json({error:error.code==='P0001'?error.message:'Unable to save your request. Please retry.'},{status:400})
  return NextResponse.json({success:true,message:'Your message was saved for our team.'})
 }catch{return NextResponse.json({error:'Unable to save your request. Please check the form and retry.'},{status:400})}
}
