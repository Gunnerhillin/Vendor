import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail, vendorApprovalEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await createServerSupabaseClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: actor } = await session.from('profiles').select('role').eq('id', user.id).single()
    if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { vendorId, type } = await request.json()
    if (!['approved', 'rejected'].includes(type)) return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })

    if (!vendorId || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Get vendor and their email
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_name, user_id, status')
      .eq('id', vendorId)
      .single()

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status !== type) return NextResponse.json({ error: 'Status does not match saved decision' }, { status: 409 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', vendor.user_id)
      .single()

    if (!profile?.email) {
      return NextResponse.json({ error: 'Vendor email not found' }, { status: 404 })
    }

    const approved = type === 'approved'

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'placeholder') {
      return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 })
    }
    const sent = await sendEmail({
      to: profile.email,
      subject: approved
        ? `Welcome to CutieValley — You're Approved!`
        : `CutieValley Application Update`,
      html: vendorApprovalEmail({
        vendorName: vendor.business_name,
        approved,
      }),
    })

    if (!sent) return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Vendor notification error:', error)
    return NextResponse.json({ error: 'Unable to send notification' }, { status: 500 })
  }
}
