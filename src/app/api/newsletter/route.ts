import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail, newsletterWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Already subscribed!' })
    }

    // Insert subscriber
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase().trim(),
        subscribed_at: new Date().toISOString(),
      })

    if (error) {
      // If table doesn't exist yet, still send welcome email
      console.error('Newsletter insert error:', error)
    }

    // Send welcome email
    await sendEmail({
      to: email,
      subject: 'Welcome to CutieValley!',
      html: newsletterWelcomeEmail(email),
    })

    return NextResponse.json({ success: true, message: 'Subscribed!' })
  } catch (error: any) {
    console.error('Newsletter error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
