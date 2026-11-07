const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const Stripe = require('stripe')
const verifier = new Stripe('sk_test_local_only')
const secret = 'whsec_test_local_only'
const source = ts.transpileModule(readFileSync('src/app/api/webhooks/stripe/route.ts','utf8'), {
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
}).outputText
let fail = false, calls = [], accountValue
const stripe = { webhooks:verifier.webhooks,
 charges:{retrieve:async()=>({id:'ch_one',payment_intent:'pi_one',amount:2000,currency:'usd'})},
 refunds:{list:()=>({autoPagingEach:async fn=>{fn({status:'succeeded',amount:500});fn({status:'pending',amount:200});fn({status:'failed',amount:100})}})},
 accounts:{retrieve:async()=>({id:'acct_one',details_submitted:true,charges_enabled:true,payouts_enabled:false})}
}
const db={rpc:async(name,args)=>{calls.push({name,args});return {error:fail?{message:'test failure'}:null}},
 from:()=>({update:value=>{accountValue=value;return {eq:async()=>({error:fail?{}:null})}}})}
const sandbox={exports:{},process:{env:{STRIPE_WEBHOOK_SECRET:secret}},console:{error:()=>{}},require(name){
 if(name==='next/server')return {NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}}
 if(name==='@/lib/stripe')return {stripe}
 if(name==='@/lib/supabase/server')return {createServiceRoleClient:async()=>db}
 throw new Error(name)
}}
vm.runInNewContext(source,sandbox)
async function send(type,object){const payload=JSON.stringify({id:'evt_one',type,data:{object}});const signature=verifier.webhooks.generateTestHeaderString({payload,secret});return sandbox.exports.POST({text:async()=>payload,headers:{get:()=>signature}})}
;(async()=>{
 assert.equal((await send('payment_intent.succeeded',{id:'pi_one',amount_received:2000,currency:'usd'})).status,200)
 assert.equal(calls[0].args.amount_cents_arg,2000)
 fail=true
 assert.equal((await send('payment_intent.succeeded',{id:'pi_one',amount_received:2000,currency:'usd'})).status,500)
 fail=false
 assert.equal((await send('charge.refunded',{id:'ch_one',object:'charge'})).status,200)
 assert.equal(calls.at(-1).args.refunded_cents_arg,500)
 assert.equal((await send('refund.updated',{id:'re_one',object:'refund',charge:'ch_one'})).status,200)
 assert.equal((await send('account.updated',{id:'acct_one'})).status,200)
 assert.equal(accountValue.stripe_onboarding_complete,false)
 fail=true
 assert.equal((await send('account.updated',{id:'acct_one'})).status,500)
 console.log('9 webhook routing, error propagation and refund-status checks passed.')
})().catch(e=>{console.error(e);process.exitCode=1})
