const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const source = ts.transpileModule(readFileSync('src/lib/product-save.ts','utf8'), {
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
}).outputText
let user = null, failure = null, calls=[]
const db={auth:{getUser:async()=>({data:{user}})},rpc:async(name,args)=>{calls.push({name,args});return {data:failure?null:{id:'saved'},error:failure}}}
const sandbox={exports:{},require(name){
 if(name==='next/server')return {NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}}
 if(name==='@/lib/supabase/server')return {createServerSupabaseClient:async()=>db}
 throw new Error(name)
}}
vm.runInNewContext(source,sandbox)
const save=sandbox.exports.saveProduct,request=body=>({json:async()=>body})
;(async()=>{
 assert.equal((await save(request({}),null)).status,401);assert.equal(calls.length,0)
 user={id:'vendor'}
 assert.equal((await save({json:async()=>{throw Error('bad json')}},null)).status,400)
 assert.equal((await save(request([]),null)).status,400);assert.equal(calls.length,0)
 assert.equal((await save(request({title:'Test'}),null)).status,201)
 assert.equal(calls[0].name,'save_vendor_product');assert.equal(calls[0].args.product_id_arg,null)
 assert.equal((await save(request({inventory_count:2,updated_at:'version'}),'product')).status,200)
 for(const [code,status] of [['40001',409],['42501',403],['P0001',400],['XX000',500]]){
   failure={code,message:'internal detail'}
   const result=await save(request({}),'product');assert.equal(result.status,status)
   if(status===500)assert.equal(result.body.error,'Product could not be saved. Please try again.')
 }
 console.log('9 product API authentication, validation, save and error cases passed.')
})().catch(err=>{console.error(err);process.exitCode=1})
