const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const transpile=path=>ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const env={}, calls=[];let user=null,role='customer',queueError=false,emailError=false,recoveryError=false
const db={auth:{getUser:async()=>({data:{user}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role}})})})}),rpc:async()=>{calls.push('claim');return{data:[{id:'order'}],error:queueError?{}:null}}}
const dependencies={
 'node:crypto':require('node:crypto'),
 'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200,headers:options.headers})}},
 '@/lib/supabase/server':{createServerSupabaseClient:async()=>db,createServiceRoleClient:async()=>{calls.push('service');return db}},
 '@/lib/checkout':{recoverReservedCheckout:async()=>{calls.push('recover');if(recoveryError)throw Error('private provider details')}},
 '@/lib/notifications':{dispatchNotifications:async()=>{calls.push('email');if(emailError)throw Error('secret provider response');return{sent:1,failed:0,claimed:1}}},
}
function load(path){const sandbox={exports:{},URL,process:{env},require:name=>{if(!(name in dependencies))throw Error(name);return dependencies[name]}};vm.runInNewContext(transpile(path),sandbox);return sandbox.exports}
const {serviceReadiness}=load('src/lib/service-readiness.ts');dependencies['@/lib/service-readiness']={serviceReadiness}
const admin=load('src/app/api/admin/readiness/route.ts'),worker=load('src/app/api/cron/operations/route.ts')
const request=token=>({headers:{get:()=>token}})
;(async()=>{
 let checks=0;const eq=(a,b)=>{assert.equal(a,b);checks++}
 eq((await admin.GET()).status,401);user={id:'u'};eq((await admin.GET()).status,403);role='admin'
 env.STRIPE_SECRET_KEY='sk_test_private_value';env.STRIPE_WEBHOOK_SECRET='whsec_private_value'
 let result=await admin.GET();eq(result.status,200);eq(result.body.stripeMode,'test');eq(JSON.stringify(result).includes('private_value'),false);eq(result.headers['Cache-Control'],'private, no-store')
 env.STRIPE_SECRET_KEY='sk_test_placeholder';eq(serviceReadiness(env).stripeMode,'missing')
 env.NEXT_PUBLIC_APP_URL='https://user:password@example.invalid';eq(serviceReadiness(env).checks[3].configured,false)
 env.NEXT_PUBLIC_APP_URL='https://www.cutievalley.com';eq(serviceReadiness(env).checks[3].configured,true)
 eq((await worker.GET(request('Bearer undefined'))).status,503);eq(calls.length,0)
 env.CRON_SECRET='a'.repeat(40);eq((await worker.GET(request('Bearer wrong'))).status,401);eq(calls.length,0)
 const valid=request('Bearer '+env.CRON_SECRET);eq((await worker.GET(valid)).status,503);eq(calls.length,0)
 env.ENABLE_BACKGROUND_OPERATIONS='true';result=await worker.GET(valid);eq(result.status,200);eq(result.body.recovery.checked,1);eq(result.body.notifications.sent,1)
 calls.length=0;queueError=true;result=await worker.GET(valid);eq(result.status,503);eq(calls.includes('email'),true)
 queueError=false;emailError=true;calls.length=0;result=await worker.GET(valid);eq(result.status,503);eq(calls.includes('recover'),true);eq(JSON.stringify(result).includes('secret'),false)
 emailError=false;recoveryError=true;result=await worker.GET(valid);eq(result.body.recovery.failed,1);eq(result.body.notifications.sent,1)
 console.log(`${checks} readiness authorization, secret redaction and background isolation checks passed.`)
})().catch(e=>{console.error(e);process.exitCode=1})
