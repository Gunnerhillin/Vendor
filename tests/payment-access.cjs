const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const id='00000000-0000-0000-0000-000000000001'
let user=null,order=null,session=null,retrieved=0,expired=0,reconciled=0,filters=[],vendor=null,accounts=0,links=0,providerFailure=false,dbFailure=false
const db={auth:{getUser:async()=>({data:{user}})},from:table=>{const chain={select:()=>chain,eq:(key,value)=>{filters.push([key,value]);return chain},single:async()=>{if(dbFailure)throw Error('sensitive database detail');return {data:table==='vendors'?vendor:order,error:null}},update:()=>chain,then:fn=>Promise.resolve({error:null}).then(fn)};return chain}}
const deps={'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200,headers:options.headers})}},'@/lib/supabase/server':{createServerSupabaseClient:async()=>db,createServiceRoleClient:async()=>db},'@/lib/checkout':{reconcileCheckout:async()=>{reconciled++}},'@/lib/stripe':{stripe:{checkout:{sessions:{retrieve:async()=>{retrieved++;return session},expire:async()=>{expired++;return {...session,status:'expired'}}}}},createConnectAccount:async()=>{accounts++;return{id:'acct'}},createAccountLink:async()=>{links++;if(providerFailure)throw Error('private provider message');return {url:'https://connect.stripe.com/test'}}}}
function load(path){const sandbox={exports:{},console:{error:()=>{}},require:n=>{if(!(n in deps))throw Error(n);return deps[n]}};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,sandbox);return sandbox.exports}
const status=load('src/app/api/checkout/status/route.ts'),connect=load('src/app/api/vendor/stripe-connect/route.ts')
const req=(body={orderId:id},query=id)=>({json:async()=>body,nextUrl:{searchParams:new URLSearchParams({order:query})}})
;(async()=>{let checks=0;const eq=(a,b)=>{assert.equal(a,b);checks++}
 eq((await status.GET(req())).status,401);eq((await status.POST(req())).status,401);eq(retrieved,0)
 user={id:'customer'};eq((await status.GET(req({},'bad'))).status,400);eq((await status.POST(req({orderId:1}))).status,400);eq((await status.POST({json:async()=>{throw Error('bad json')}})).status,400)
 eq((await status.GET(req())).status,404);eq((await status.POST(req())).status,404);eq(retrieved,0);eq(filters.some(([k,v])=>k==='customer_id'&&v==='customer'),true)
 order={id,checkout_session_id:'cs',reservation_state:'reserved',payment_processed_at:null,total:10,checkout_cart:[]};session={id:'cs',metadata:{order_id:'another'},client_reference_id:'another',status:'open'}
 eq((await status.POST(req())).status,409);eq(expired,0);eq(reconciled,0);eq((await status.GET(req())).status,503);eq(reconciled,0)
 session={...session,metadata:{order_id:id},client_reference_id:id};eq((await status.POST(req())).body.cancelled,true);eq(expired,1);eq(reconciled,1)
 session.status='complete';eq((await status.POST(req())).body.cancelled,false);eq(expired,1)
 eq((await connect.POST(req())).status,401);eq(accounts,0);user={id:'customer',email:'test@example.invalid',email_confirmed_at:'now'};eq((await connect.POST(req())).status,404)
 vendor={id:'vendor',business_name:'Test',status:'pending'};eq((await connect.POST(req())).status,403);eq(accounts,0)
 vendor.status='approved';vendor.stripe_account_id='acct_existing';eq((await connect.POST(req())).status,200);eq(accounts,0);eq(links,1)
 providerFailure=true;const failed=await connect.POST(req());eq(failed.status,500);eq(JSON.stringify(failed).includes('private provider'),false)
 dbFailure=true;const unexpected=await connect.POST(req());eq(unexpected.status,500);eq(JSON.stringify(unexpected).includes('sensitive database'),false)
 console.log(`${checks} checkout ownership, cancellation and vendor payment-access checks passed.`)
})().catch(e=>{console.error(e);process.exitCode=1})
