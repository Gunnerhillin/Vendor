const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const source=ts.transpileModule(readFileSync('src/lib/financial-operations.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
let calls=[],finished=[],refunds=[],transfers=[],reversals=[],op,live=false,chargeRefunded=0,refundStatus='succeeded'
const order={checkout_livemode:false,refunded_amount_cents:0,total:21}
const paged=items=>({autoPagingEach:async fn=>{for(const item of items) await fn(item)}})
const stripe={charges:{retrieve:async()=>({id:'ch',livemode:live,paid:true,disputed:false,currency:'usd',amount:2100,amount_refunded:chargeRefunded})},accounts:{retrieve:async()=>({details_submitted:true,payouts_enabled:true,capabilities:{transfers:'active'}})},
 transfers:{list:()=>paged(transfers),retrieve:async id=>transfers.find(t=>t.id===id),create:async(args,options)=>{calls.push(['transfer',args,options]);const t={...args,id:'tr',amount_reversed:0};transfers.push(t);return t},listReversals:()=>paged(reversals),retrieveReversal:async(id,rid)=>reversals.find(r=>r.id===rid),createReversal:async(id,args,options)=>{calls.push(['reversal',args,options]);const r={...args,id:'trr',transfer:id};reversals.push(r);return r}},
 refunds:{list:()=>paged(refunds),retrieve:async id=>refunds.find(r=>r.id===id),create:async(args,options)=>{calls.push(['refund',args,options]);const r={...args,id:'re',currency:'usd',status:refundStatus};refunds.push(r);return r}}}
const db={from:table=>{let values;const chain={select:()=>chain,eq:()=>chain,update:v=>{values=v;return chain},single:async()=>({data:table==='orders'?order:op}),then:fn=>{if(values)Object.assign(op,values);return Promise.resolve({error:null}).then(fn)}};return chain},rpc:async(name,args)=>{finished.push(args);return {error:null}}}
const sandbox={exports:{},process:{env:{}},Date,require:name=>name==='@/lib/stripe'?{stripe}:name==='@/lib/supabase/server'?{createServiceRoleClient:async()=>db}:(()=>{throw Error(name)})()}
vm.runInNewContext(source,sandbox)
const execute=sandbox.exports.executeFinancialOperation
function reset(kind='refund'){calls=[];finished=[];refunds=[];transfers=[];reversals=[];live=false;chargeRefunded=0;refundStatus='succeeded';order.checkout_livemode=false;op={id:'operation',kind,order_id:'order',amount_cents:kind==='transfer'?1500:2100,vendor_cents:1500,charge_id:'ch',destination:'acct',created_at:new Date().toISOString()}}
;(async()=>{
 reset();await execute(op);assert.equal(calls.length,1);assert.equal(calls[0][2].idempotencyKey,'finance-refund:operation');assert.equal(finished.length,1)
 await execute(op);assert.equal(calls.length,1)
 reset();refundStatus='pending';assert.equal((await execute(op)).status,'pending');assert.equal(finished.length,0)
 reset();op.transfer_id='tr';await execute(op);assert.deepEqual(calls.map(c=>c[0]),['reversal','refund']);assert.equal(op.reversal_id,'trr')
 reset('transfer');await execute(op);assert.equal(calls[0][1].source_transaction,'ch');assert.equal(finished.length,1);await execute(op);assert.equal(calls.length,1)
 reset();op.created_at=new Date(Date.now()-24*3600000).toISOString();await assert.rejects(()=>execute(op));assert.equal(calls.length,0)
 reset('transfer');chargeRefunded=100;await assert.rejects(()=>execute(op));assert.equal(calls.length,0)
 reset();live=true;order.checkout_livemode=true;await assert.rejects(()=>execute(op));assert.equal(calls.length,0)
 reset();refunds=[{id:'existing',charge:'ch',currency:'usd',amount:2100,status:'succeeded',metadata:{operation_id:'operation'}}];op.created_at=new Date(Date.now()-48*3600000).toISOString();await execute(op);assert.equal(calls.length,0);assert.equal(finished[0].provider_arg,'existing')
 console.log('19 financial provider retry, recovery, reversal, pending and live-gate checks passed.')
})().catch(e=>{console.error(e);process.exitCode=1})
