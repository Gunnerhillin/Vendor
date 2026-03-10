import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail, vendorApprovalEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { vendorId, type } = await request.json()

    if (!vendorId || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Get vendor and their email
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_name, user_id')
      .eq('id', vendorId)
      .single()

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', vendor.user_id)
      .single()

    if (!profile?.email) {
      return NextResponse.json({ error: 'Vendor email not found' }, { status: 404 })
    }

    const approved = type === 'approved'

    await sendEmail({
      to: profile.email,
      subject: approved
        ? `Welcome to Vender — You're Approved!`
        : `Vender Application Update`,
      html: vendorApprovalEmail({
        vendorName: vendor.business_name,
        approved,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Vendor notification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
