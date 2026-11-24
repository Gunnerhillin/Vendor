const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const compile=path=>ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
let user=null,role='customer',providerCalls=0,operations=[],refunds=[],transfers=[],more=false,fail=false
const order={id:'order',total:10,payment_charge_id:'ch',checkout_livemode:false,refunded_amount_cents:0}
const charge={id:'ch',currency:'usd',amount:1000,livemode:false,paid:true,disputed:false,amount_refunded:0}
const db={auth:{getUser:async()=>({data:{user}})},from:table=>{const result=()=>({data:table==='orders'?order:table==='profiles'?{role}:operations,error:null});const chain={select:()=>chain,eq:()=>chain,single:async()=>result(),then:fn=>Promise.resolve(result()).then(fn)};return chain}}
const stripe={charges:{retrieve:async()=>{providerCalls++;if(fail)throw Error('secret-provider-details');return charge}},refunds:{list:async()=>({data:refunds,has_more:more})},transfers:{list:async()=>({data:transfers,has_more:more})}}
const deps={'@/lib/stripe':{stripe},'@/lib/supabase/server':{createServiceRoleClient:async()=>db,createServerSupabaseClient:async()=>db},'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200,headers:options.headers})}}}
function load(path){const sandbox={exports:{},Date,require:n=>{if(!(n in deps))throw Error(n);return deps[n]}};vm.runInNewContext(compile(path),sandbox);return sandbox.exports}
const {reviewOrderFinances}=load('src/lib/financial-review.ts');deps['@/lib/financial-review']={reviewOrderFinances}
const {GET}=load('src/app/api/admin/finance/review/route.ts');const request=id=>({nextUrl:{searchParams:new URLSearchParams({orderId:id})}})
;(async()=>{let checks=0;const eq=(a,b)=>{assert.equal(a,b);checks++};const valid=request('00000000-0000-0000-0000-000000000001')
 eq((await GET(valid)).status,401);user={id:'user'};eq((await GET(valid)).status,403);eq(providerCalls,0);role='admin';eq((await GET(request('invalid'))).status,400);eq(providerCalls,0)
 let report=await reviewOrderFinances('order');eq(report.warnings.length,0);eq(report.recordedRefundedCents,0)
 charge.disputed=true;report=await reviewOrderFinances('order');eq(report.warnings.some(w=>w.includes('dispute')),true)
 charge.amount_refunded=500;refunds=[{id:'re_external',amount:500,status:'failed',metadata:{}}];report=await reviewOrderFinances('order');eq(report.warnings.some(w=>w.includes('ledger differ')),true);eq(report.warnings.some(w=>w.includes('not linked')),true);eq(report.warnings.some(w=>w.includes('did not complete')),true)
 operations=[{id:'op',kind:'refund',status:'pending',amount_cents:500,provider_id:'re_external'}];report=await reviewOrderFinances('order');eq(report.refunds[0].operationId,'op');eq(report.warnings.some(w=>w.includes('remains unconfirmed')),true)
 more=true;transfers=[{id:'tr',amount:800,amount_reversed:100,source_transaction:'wrong',currency:'usd',metadata:{}}];report=await reviewOrderFinances('order');eq(report.incomplete,true);eq(report.warnings.some(w=>w.includes('reversed funds')),true);eq(report.warnings.some(w=>w.includes('differs from the saved charge')),true)
 charge.livemode=true;await assert.rejects(()=>reviewOrderFinances('order'));checks++;charge.livemode=false
 fail=true;const response=await GET(valid);eq(response.status,503);eq(JSON.stringify(response).includes('secret-provider-details'),false)
 console.log(`${checks} read-only financial review, access, mismatch and redaction checks passed.`)
})().catch(e=>{console.error(e);process.exitCode=1})
