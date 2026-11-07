const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const Stripe = require('stripe')
const stripe = new Stripe('sk_test_local_only')
const source = ts.transpileModule(readFileSync('src/app/api/webhooks/stripe/route.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText
let calls = 0
const sandbox = { exports: {}, process: { env: {} }, console,
  require(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } }
    if (name === '@/lib/stripe') return { stripe }
    if (name === '@/lib/supabase/server') return { createServiceRoleClient: async () => { calls++; return {} } }
    throw new Error(name)
  }
}
vm.runInNewContext(source, sandbox)
const payload = JSON.stringify({id:'evt_test',type:'test.unhandled',data:{object:{}}})
const secret = 'whsec_local_test_only'
async function check(config, signature, expected) {
  sandbox.process.env.STRIPE_WEBHOOK_SECRET = config
  const result = await sandbox.exports.POST({ text: async () => payload, headers: { get: () => signature } })
  assert.equal(result.status,expected)
}
;(async () => {
  await check(undefined,null,503)
  await check('whsec_placeholder',null,503)
  await check(secret,null,400)
  await check(secret,'invalid',400)
  const wrong = stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_wrong'})
  await check(secret,wrong,400)
  assert.equal(calls,0,'Unverified requests must never access the database')
  await check(secret,stripe.webhooks.generateTestHeaderString({payload,secret}),200)
  assert.equal(calls,1)
  console.log('6 webhook signature cases passed; rejected requests never access the database.')
})().catch(error => { console.error(error); process.exitCode=1 })
