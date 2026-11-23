const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const source=ts.transpileModule(readFileSync('src/lib/checkout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
let calls=[],sessions=[],creates=[],linkFail=false
const session={id:'cs',metadata:{order_id:'order'},client_reference_id:'order',amount_subtotal:1000,amount_total:1050,total_details:{amount_tax:50},currency:'usd',livemode:false,status:'complete',payment_status:'paid',payment_intent:'pi',shipping_details:{name:'Test',address:{line1:'Test',postal_code:'00000',country:'US'}},url:'https://checkout.stripe.com/test'}
const db={rpc:async(name,args)=>{calls.push({name,args});return {error:linkFail&&name==='link_checkout_session'?{}:null}}}
const stripe={paymentIntents:{retrieve:async()=>({id:'pi',status:'succeeded',amount_received:1050,latest_charge:'ch'})},checkout:{sessions:{retrieve:async()=>session,create:async(params,options)=>{creates.push({params,options});return {...session,status:'open'}},list:()=>({autoPagingEach:async fn=>{for(const item of sessions)if(await fn(item)===false)break}})}}}
const sandbox={exports:{},Date,process:{env:{NEXT_PUBLIC_APP_URL:'https://example.invalid'}},require:name=>name==='@/lib/stripe'?{stripe}:name==='@/lib/supabase/server'?{createServiceRoleClient:async()=>db}:(()=>{throw Error(name)})()}
vm.runInNewContext(source,sandbox)
;(async()=>{
 const {reconcileCheckout,recoverReservedCheckout,startCheckout}=sandbox.exports
 await reconcileCheckout(session,'event');assert.equal(calls[0].name,'link_checkout_session');assert.equal(calls[1].name,'complete_checkout');assert.equal(calls[1].args.tax_arg,50)
 calls=[];await reconcileCheckout({...session,status:'expired'},'expired');assert.equal(calls[1].name,'release_checkout')
 calls=[];await assert.rejects(()=>reconcileCheckout({...session,client_reference_id:'wrong'},'bad'));assert.equal(calls.length,0)
 await reconcileCheckout({...session,metadata:{}},'unrelated');assert.equal(calls.length,0)
 sessions=[{...session,id:'unrelated',metadata:{}},session];await recoverReservedCheckout({id:'order',created_at:new Date().toISOString()});assert.equal(calls[0].name,'link_checkout_session')
 sessions=[];calls=[];await assert.rejects(()=>recoverReservedCheckout({id:'order',created_at:new Date().toISOString()}));assert.equal(calls.length,0)
 const order={id:'order',reservation_state:'reserved',checkout_email:'test@example.invalid',reservation_expires_at:new Date(Date.now()+35*60000).toISOString()}
 const items=[{quantity:1,unit_price:10,product_title:'Item'}]
 linkFail=true;await assert.rejects(()=>startCheckout(order,items));linkFail=false;await startCheckout(order,items)
 assert.equal(creates[0].options.idempotencyKey,'checkout:order');assert.deepEqual(creates[0],creates[1]);assert.equal(creates[0].params.line_items[0].price_data.unit_amount,1000)
 console.log('13 checkout linking, interrupted-save recovery and safe retry checks passed.')
})().catch(e=>{console.error(e);process.exitCode=1})
