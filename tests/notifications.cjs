const {readFileSync}=require('node:fs')
const vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const source=ts.transpileModule(readFileSync('src/lib/notifications.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
let sent=[],updates=[],jobs=[],failure=false,claims=0
const db={rpc:async()=>{claims++;return {data:jobs}},from:table=>({update:value=>{updates.push(value);const chain={eq:()=>chain,select:()=>chain,maybeSingle:async()=>({data:{id:'job'}}),then:fn=>Promise.resolve({error:null}).then(fn)};return chain},select:()=>{const chain={eq:()=>chain,single:async()=>({data:table==='orders'?{id:'order-id',payment_processed_at:'now',checkout_email:'customer@example.invalid'}:{email:'vendor@example.invalid',user_id:'vendor'}})};return chain}})}
const env={RESEND_API_KEY:'re_test',FROM_EMAIL:'Test <test@example.invalid>',NEXT_PUBLIC_APP_URL:'https://example.invalid'}
const sandbox={exports:{},process:{env},Date,AbortSignal,fetch:async(url,args)=>{sent.push(args);return {ok:!failure,json:async()=>({id:'email-id'})}},require:name=>{if(name==='@/lib/supabase/server')return {createServiceRoleClient:async()=>db};throw Error(name)}}
vm.runInNewContext(source,sandbox)
;(async()=>{
 delete env.FROM_EMAIL;await assert.rejects(()=>sandbox.exports.dispatchNotifications());assert.equal(claims,0)
 env.FROM_EMAIL='Test <test@example.invalid>'
 jobs=[{id:'job-1',attempts:1,kind:'customer_order',order_id:'order-id',payload:{}}]
 let result=await sandbox.exports.dispatchNotifications();assert.equal(result.sent,1);assert.equal(sent[0].headers['Idempotency-Key'],'notification/job-1');assert.equal(JSON.parse(sent[0].body).to[0],'customer@example.invalid');assert.equal(updates.at(-1).provider_message_id,'email-id')
 const snapshot={from:'Original <test@example.invalid>',to:['original@example.invalid'],subject:'Original',html:'Original'}
 jobs=[{...jobs[0],attempts:2,email_snapshot:snapshot}];failure=true
 result=await sandbox.exports.dispatchNotifications();assert.equal(result.failed,1);assert.deepEqual(JSON.parse(sent.at(-1).body),snapshot);assert.equal(updates.at(-1).status,'failed');assert.ok(updates.at(-1).next_attempt_at)
 console.log('10 notification configuration, snapshot, idempotency and retry checks passed.')
})().catch(e=>{console.error(e);process.exitCode=1})
