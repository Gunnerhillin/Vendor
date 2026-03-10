// Email utility - supports Resend, or falls back to console logging in dev
// To enable: npm install resend && set RESEND_API_KEY in .env.local

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'Vender <noreply@vender.com>'
const SITE_NAME = 'Vender'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  // If Resend is configured, use it
  if (RESEND_API_KEY && RESEND_API_KEY !== 'placeholder') {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject,
          html,
        }),
      })

      if (!res.ok) {
        const error = await res.text()
        console.error('Resend API error:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Email send error:', err)
      return false
    }
  }

  // Dev mode: log to console
  console.log('=== EMAIL (dev mode) ===')
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log('========================')
  return true
}

// =============================================
// EMAIL TEMPLATES
// =============================================

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #FDFBF9; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #E8E2DC; }
    .logo { font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #2D2926; text-align: center; margin-bottom: 24px; }
    .logo span { color: #C4956A; }
    .btn { display: inline-block; padding: 12px 24px; background: #C4956A; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { text-align: center; padding: 24px 0; color: #6B6560; font-size: 13px; }
    h1 { color: #2D2926; font-size: 22px; margin: 0 0 16px; }
    p { color: #6B6560; line-height: 1.6; margin: 0 0 12px; }
    .divider { border-top: 1px solid #E8E2DC; margin: 20px 0; }
    .item-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-row { font-weight: bold; color: #2D2926; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">V<span>ender</span></div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Vender. All rights reserved.</p>
      <p>You're receiving this because you have an account at Vender.</p>
    </div>
  </div>
</body>
</html>
`

export function orderConfirmationEmail(data: {
  customerName: string
  orderId: string
  items: { title: string; quantity: number; price: number }[]
  subtotal: number
  tax: number
  shipping: number
  total: number
}) {
  const itemsHtml = data.items.map(item => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0ebe6;">
      <span style="color: #2D2926;">${item.title} x${item.quantity}</span>
      <span style="color: #2D2926; font-weight: 500;">$${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('')

  return emailWrapper(`
    <h1>Order Confirmed!</h1>
    <p>Hi ${data.customerName || 'there'},</p>
    <p>Thanks for your order! We're getting everything ready for you.</p>
    <p style="color: #6B6560; font-size: 14px;">Order #${data.orderId.slice(0, 8)}</p>
    <div class="divider"></div>
    ${itemsHtml}
    <div class="divider"></div>
    <div style="padding: 4px 0; display: flex; justify-content: space-between;">
      <span style="color: #6B6560;">Subtotal</span>
      <span>$${data.subtotal.toFixed(2)}</span>
    </div>
    <div style="padding: 4px 0; display: flex; justify-content: space-between;">
      <span style="color: #6B6560;">Shipping</span>
      <span>${data.shipping === 0 ? 'Free' : '$' + data.shipping.toFixed(2)}</span>
    </div>
    <div style="padding: 4px 0; display: flex; justify-content: space-between;">
      <span style="color: #6B6560;">Tax</span>
      <span>$${data.tax.toFixed(2)}</span>
    </div>
    <div style="padding: 8px 0; display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: #2D2926; border-top: 2px solid #E8E2DC; margin-top: 8px;">
      <span>Total</span>
      <span>$${data.total.toFixed(2)}</span>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${SITE_URL}/account/orders" class="btn">View Your Order</a>
    </div>
  `)
}

export function shippingUpdateEmail(data: {
  customerName: string
  orderId: string
  trackingNumber?: string
  carrier?: string
  status: string
}) {
  const statusMessages: Record<string, string> = {
    shipped: 'Your order has been shipped!',
    delivered: 'Your order has been delivered!',
    processing: 'Your order is being prepared.',
  }

  const trackingHtml = data.trackingNumber ? `
    <div style="background: #F7F2ED; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #6B6560;">Tracking Number</p>
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #2D2926; letter-spacing: 1px;">${data.trackingNumber}</p>
      ${data.carrier ? `<p style="margin: 4px 0 0; font-size: 13px; color: #6B6560;">via ${data.carrier}</p>` : ''}
    </div>
  ` : ''

  return emailWrapper(`
    <h1>${statusMessages[data.status] || 'Order Update'}</h1>
    <p>Hi ${data.customerName || 'there'},</p>
    <p>Here's an update on your order #${data.orderId.slice(0, 8)}.</p>
    ${trackingHtml}
    <div style="text-align: center; margin-top: 24px;">
      <a href="${SITE_URL}/account/orders" class="btn">Track Your Order</a>
    </div>
  `)
}

export function vendorNewOrderEmail(data: {
  vendorName: string
  orderId: string
  items: { title: string; quantity: number; price: number }[]
  totalRevenue: number
}) {
  const itemsHtml = data.items.map(item => `
    <div style="padding: 8px 0; border-bottom: 1px solid #f0ebe6;">
      <strong>${item.title}</strong> x${item.quantity} — $${(item.price * item.quantity).toFixed(2)}
    </div>
  `).join('')

  return emailWrapper(`
    <h1>New Order!</h1>
    <p>Hi ${data.vendorName},</p>
    <p>Great news — you have a new order to fulfill!</p>
    <p style="color: #6B6560; font-size: 14px;">Order #${data.orderId.slice(0, 8)}</p>
    <div class="divider"></div>
    ${itemsHtml}
    <div class="divider"></div>
    <div style="padding: 8px 0; font-weight: bold; font-size: 16px; color: #2D2926;">
      Your earnings: $${data.totalRevenue.toFixed(2)} (after commission)
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${SITE_URL}/vendor/orders" class="btn">View Order Details</a>
    </div>
  `)
}

export function vendorApprovalEmail(data: {
  vendorName: string
  approved: boolean
}) {
  if (data.approved) {
    return emailWrapper(`
      <h1>You're Approved!</h1>
      <p>Hi ${data.vendorName},</p>
      <p>Congratulations! Your vendor application has been approved. You can now start listing products on Vender.</p>
      <p>Next steps:</p>
      <p>1. Set up your Stripe account to receive payments<br>
         2. Add your first products<br>
         3. Start selling!</p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${SITE_URL}/vendor/dashboard" class="btn">Go to Dashboard</a>
      </div>
    `)
  }

  return emailWrapper(`
    <h1>Application Update</h1>
    <p>Hi ${data.vendorName},</p>
    <p>Thank you for your interest in selling on Vender. Unfortunately, we're unable to approve your application at this time.</p>
    <p>This could be due to incomplete information or your products not being the right fit for our marketplace at this time. You're welcome to apply again in the future.</p>
    <p>If you have questions, please reach out to our support team.</p>
  `)
}

export function newsletterWelcomeEmail(email: string) {
  return emailWrapper(`
    <h1>Welcome to Vender!</h1>
    <p>Thanks for subscribing to the Vender newsletter.</p>
    <p>You'll be the first to know about new vendors, exclusive deals, and limited drops. We only send the good stuff — no spam, ever.</p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${SITE_URL}" class="btn">Start Shopping</a>
    </div>
  `)
}

export function welcomeEmail(data: { name: string }) {
  return emailWrapper(`
    <h1>Welcome to Vender!</h1>
    <p>Hi ${data.name},</p>
    <p>Thanks for creating your account! You're now part of a community that supports independent brands and creators.</p>
    <p>Here's what you can do:</p>
    <div style="background: #F7F2ED; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px;"><strong>🛍️ Shop curated products</strong> from independent vendors</p>
      <p style="margin: 0 0 8px;"><strong>❤️ Save your favorites</strong> to your wishlist</p>
      <p style="margin: 0;"><strong>⭐ Leave reviews</strong> to help other shoppers</p>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${SITE_URL}" class="btn">Start Shopping</a>
    </div>
  `)
}

export function reviewRequestEmail(data: {
  customerName: string
  orderId: string
  items: { title: string; slug: string }[]
}) {
  const itemLinks = data.items.slice(0, 3).map(item => `
    <div style="padding: 12px 0; border-bottom: 1px solid #f0ebe6;">
      <a href="${SITE_URL}/products/${item.slug}" style="color: #2D2926; font-weight: 500; text-decoration: none;">${item.title}</a>
      <br/>
      <a href="${SITE_URL}/products/${item.slug}" style="color: #C4956A; font-size: 13px; text-decoration: none;">Leave a review →</a>
    </div>
  `).join('')

  return emailWrapper(`
    <h1>How was your order?</h1>
    <p>Hi ${data.customerName || 'there'},</p>
    <p>We hope you're enjoying your recent purchase! Your feedback helps other shoppers and supports the indie brands you love.</p>
    <p style="color: #6B6560; font-size: 14px;">Order #${data.orderId.slice(0, 8)}</p>
    <div class="divider"></div>
    ${itemLinks}
    <div class="divider"></div>
    <p style="font-size: 13px; color: #6B6560;">Reviews take less than a minute and make a big difference for small businesses.</p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${SITE_URL}/account/orders" class="btn">Review Your Order</a>
    </div>
  `)
}
