import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createConnectAccount, createAccountLink } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
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
        const account = await createConnectAccount(user.email!, vendor.business_name)
        stripeAccountId = account.id

        const { error: updateError } = await supabase
          .from('vendors')
          .update({ stripe_account_id: account.id })
          .eq('id', vendor.id)

        if (updateError) {
          console.error('Failed to update vendor with stripe account:', updateError)
          return NextResponse.json({ error: 'Failed to save Stripe account' }, { status: 500 })
        }
      } catch (error: any) {
        console.error('Failed to create Stripe Connect account:', error)
        return NextResponse.json({ error: 'Failed to create Stripe account' }, { status: 500 })
      }
    }

    // Create onboarding link
    try {
      const accountLink = await createAccountLink(stripeAccountId)
      return NextResponse.json({ url: accountLink.url })
    } catch (error: any) {
      console.error('Failed to create account link:', error)
      return NextResponse.json({ error: 'Failed to create onboarding link' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json({ error: error.message || 'Stripe Connect failed' }, { status: 500 })
  }
}
