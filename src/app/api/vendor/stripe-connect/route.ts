import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createConnectAccount, createAccountLink } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Sign in with a verified email before connecting a payment account.' }, { status: 401 })
    }

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id,business_name,status,stripe_account_id')
      .eq('user_id', user.id)
      .single()

    if (vendorError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status !== 'approved') {
      return NextResponse.json({ error: 'Vendor not approved' }, { status: 403 })
    }

    let stripeAccountId = vendor.stripe_account_id

    // Create account if not exists
    if (!stripeAccountId) {
      try {
        const account = await createConnectAccount(user.email!, vendor.business_name, vendor.id)
        stripeAccountId = account.id

        const service = await createServiceRoleClient()
        const { error: updateError } = await service
          .from('vendors')
          .update({ stripe_account_id: account.id })
          .eq('id', vendor.id)

        if (updateError) {
          console.error('Failed to save vendor payment account')
          return NextResponse.json({ error: 'Failed to save Stripe account' }, { status: 500 })
        }
      } catch (error: any) {
        console.error('Vendor payment account creation failed')
        return NextResponse.json({ error: 'Failed to create Stripe account' }, { status: 500 })
      }
    }

    // Create onboarding link
    try {
      const accountLink = await createAccountLink(stripeAccountId)
      return NextResponse.json({ url: accountLink.url })
    } catch (error: any) {
      console.error('Vendor payment setup link creation failed')
      return NextResponse.json({ error: 'Failed to create onboarding link' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Vendor payment setup failed')
    return NextResponse.json({ error: 'Unable to open payment setup. Please retry or contact support.' }, { status: 500 })
  }
}
