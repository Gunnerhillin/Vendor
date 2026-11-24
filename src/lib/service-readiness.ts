// Configuration presence is not evidence of a successful provider integration.
export function serviceReadiness(env: NodeJS.ProcessEnv) {
  const present = (value?: string) => !!value && !/placeholder|your[_-]|example/i.test(value)
  const key = env.STRIPE_SECRET_KEY || ''
  const mode = present(key) && /^(sk|rk)_live_/.test(key) ? 'live' : present(key) && /^(sk|rk)_test_/.test(key) ? 'test' : 'missing'
  let originReady = false
  try { const url = new URL(env.NEXT_PUBLIC_APP_URL || ''); originReady = url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash } catch {}
  return {
    stripeMode: mode,
    checks: [
      { name: 'Payment credentials', configured: mode !== 'missing', detail: 'Sandbox checkout, refunds and vendor transfers still need an end-to-end test.' },
      { name: 'Stripe webhook signing secret', configured: present(env.STRIPE_WEBHOOK_SECRET) && env.STRIPE_WEBHOOK_SECRET!.startsWith('whsec_'), detail: 'Verify successful event delivery in Stripe; a saved secret alone does not prove delivery.' },
      { name: 'Order email sender', configured: present(env.RESEND_API_KEY) && present(env.FROM_EMAIL) && originReady, detail: 'Verify the sender domain and delivery to a real test inbox.' },
      { name: 'Secure store address', configured: originReady, detail: 'Use the HTTPS storefront origin without a path, query or trailing credentials.' },
      { name: 'Background worker', configured: present(env.CRON_SECRET) && (env.CRON_SECRET?.length || 0) >= 32 && env.ENABLE_BACKGROUND_OPERATIONS === 'true', detail: 'Schedule the protected worker after staging tests. Configuration does not prove the schedule is running.' },
    ],
    liveCheckoutAllowed: env.ENABLE_LIVE_CHECKOUT === 'true',
    liveFinancialOperationsAllowed: env.ENABLE_LIVE_FINANCIAL_OPERATIONS === 'true',
  }
}
