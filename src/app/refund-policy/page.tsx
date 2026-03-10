import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Vender refund and return policy for purchases made through our marketplace.',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-warm-100 via-warm-200 to-accent-light py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Refund & Return Policy</h1>
          <p className="text-gray-600">Last updated: February 2026</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-12 prose prose-sm">

        <h2>Overview</h2>
        <p>
          Vender is a marketplace connecting you with independent vendors. Each product is sold directly by its vendor, and refund policies may vary. This page outlines our general refund framework that all Vender vendors must follow.
        </p>

        <h2>Return Eligibility</h2>
        <p>
          Items in returnable condition are eligible for a return. To qualify, the item must be unused, in the same condition you received it, and in its original packaging. Individual vendors may have additional conditions listed on their product pages.
        </p>

        <h2>How to Request a Return</h2>
        <p>To initiate a return or refund, please follow these steps:</p>
        <ol>
          <li>Go to your <Link href="/account/orders" className="text-accent-dark hover:underline">order history</Link> and find the order.</li>
          <li>Click &quot;Request Return&quot; on the item you&apos;d like to return and select a reason.</li>
          <li>The vendor will review your request and provide return shipping instructions.</li>
          <li>Once the returned item is received and inspected, we will process your refund.</li>
          <li>If you have trouble with a vendor, contact <a href="mailto:support@vender.com" className="text-accent-dark hover:underline">support@vender.com</a> — our customer service team can override vendor decisions.</li>
        </ol>

        <h2>Refund Processing</h2>
        <p>
          Refunds are processed to your original payment method within 5-10 business days after the returned item is received by the vendor. You will receive an email confirmation when your refund has been processed.
        </p>

        <h2>Non-Returnable Items</h2>
        <p>Certain items cannot be returned:</p>
        <ul>
          <li>Custom or personalized items</li>
          <li>Perishable goods (food, flowers, etc.)</li>
          <li>Intimate or sanitary goods</li>
          <li>Digital downloads</li>
          <li>Items marked as &quot;Final Sale&quot;</li>
        </ul>

        <h2>Damaged or Defective Items</h2>
        <p>
          If you receive a damaged or defective item, please contact us within 48 hours of delivery with photos of the damage. We will arrange a replacement or full refund at no additional cost to you.
        </p>

        <h2>Exchanges</h2>
        <p>
          We do not currently offer direct exchanges. If you need a different size, color, or variant, please return the original item for a refund and place a new order.
        </p>

        <h2>Shipping Costs</h2>
        <p>
          Return shipping costs are the responsibility of the buyer, unless the item was received damaged, defective, or incorrect. In those cases, Vender or the vendor will cover return shipping.
        </p>

        <h2>Late or Missing Refunds</h2>
        <p>
          If you haven&apos;t received your refund within 10 business days of our confirmation email, please check with your bank or credit card provider first (processing times vary). If you still haven&apos;t received it, contact us at <a href="mailto:support@vender.com" className="text-accent-dark hover:underline">support@vender.com</a>.
        </p>

        <h2>Vendor-Specific Policies</h2>
        <p>
          Individual vendors may have additional return conditions listed on their product pages. These conditions will be clearly displayed before purchase. If a vendor&apos;s policy is more generous than ours, the vendor&apos;s policy applies.
        </p>

        <h2>Contact Us</h2>
        <p>
          For any questions about returns or refunds, reach out to our support team at <a href="mailto:support@vender.com" className="text-accent-dark hover:underline">support@vender.com</a> or visit our <Link href="/contact" className="text-accent-dark hover:underline">contact page</Link>.
        </p>
      </div>
    </div>
  )
}
