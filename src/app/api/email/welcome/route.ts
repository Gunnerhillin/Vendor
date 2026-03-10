import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, welcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email || !name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const html = welcomeEmail({ name })
    await sendEmail({
      to: email,
      subject: `Welcome to Vender, ${name}!`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
