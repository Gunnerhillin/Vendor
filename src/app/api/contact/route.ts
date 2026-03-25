import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL?.match(/<(.+)>/)?.[1] || 'support@cutievalley.com'

const SUBJECT_LABELS: Record<string, string> = {
  order: 'Order Issue',
  product: 'Product Question',
  vendor: 'Vendor Inquiry',
  partnership: 'Partnership',
  feedback: 'Feedback',
  other: 'Other',
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()

    // Validate
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const subjectLabel = SUBJECT_LABELS[subject] || subject

    // Send notification to admin
    const adminHtml = `
      <h1>New Contact Form Submission</h1>
      <div style="background: #F7F2ED; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>From:</strong> ${name} (${email})</p>
        <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${subjectLabel}</p>
      </div>
      <div style="border-left: 3px solid #C4956A; padding-left: 16px; margin: 16px 0;">
        <p style="white-space: pre-wrap; color: #2D2926;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
      <p style="font-size: 13px; color: #6B6560;">Reply directly to this email to respond to the customer.</p>
    `

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[CutieValley Contact] ${subjectLabel} from ${name}`,
      html: adminHtml,
    })

    // Send confirmation to the user
    const confirmHtml = `
      <h1>We Got Your Message!</h1>
      <p>Hi ${name},</p>
      <p>Thanks for reaching out to CutieValley. We've received your message and will get back to you within 24 hours.</p>
      <div style="background: #F7F2ED; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 4px; font-size: 13px; color: #6B6560;">Your message:</p>
        <p style="margin: 0; color: #2D2926; font-style: italic;">"${message.length > 200 ? message.slice(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '...' : message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</p>
      </div>
      <p>In the meantime, feel free to browse our latest products.</p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vendor-uiu3.vercel.app'}" class="btn">Visit CutieValley</a>
      </div>
    `

    await sendEmail({
      to: email,
      subject: 'We received your message — CutieValley',
      html: confirmHtml,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
