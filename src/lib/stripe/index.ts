import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

export async function createConnectAccount(vendorEmail: string, vendorName: string, vendorId: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    email: vendorEmail,
    business_profile: {
      name: vendorName,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  }, { idempotencyKey: `vendor-connect-${vendorId}` })
  return account
}

export async function createAccountLink(accountId: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/settings?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/settings?stripe=complete`,
    type: 'account_onboarding',
  })
  return accountLink
}

export async function createPaymentIntent(
  amount: number,
  vendorStripeAccountId: string,
  commissionRate: number,
  metadata: Record<string, string>
) {
  const applicationFee = Math.round(amount * commissionRate)

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    application_fee_amount: applicationFee,
    transfer_data: {
      destination: vendorStripeAccountId,
    },
    metadata,
    automatic_payment_methods: { enabled: true },
  })

  return paymentIntent
}
