const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')
const suites = [
  'approval/approval.test.mjs', 'approval/payment.test.mjs', 'approval/product.test.mjs',
  'approval/checkout.test.mjs', 'checkout-recovery.cjs', 'financial-operations.cjs',
  'financial-review.cjs', 'notifications.cjs', 'operations.cjs', 'product-api.cjs',
  'webhook-signature.cjs', 'webhook-processing.cjs',
]
for (const suite of suites) {
  const result = spawnSync(process.execPath, [resolve(__dirname, suite)], {
    cwd: resolve(__dirname, '..'), stdio: 'inherit', timeout: 120000,
  })
  if (result.error || result.status !== 0) {
    console.error(`Failed suite: ${suite}`)
    process.exit(result.status || 1)
  }
}
console.log(`All ${suites.length} local suites passed. External integrations still require staging tests.`)
