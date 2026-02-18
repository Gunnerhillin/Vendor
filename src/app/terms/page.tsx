import Link from 'next/link'

export default function TermsOfServicePage() {
  return (
    <div className="page-container py-12 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: February 2026</p>

      <div className="prose prose-sm text-gray-600 space-y-8">
        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Vender platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. We reserve the right to update or modify these terms at any time, and your continued use of the platform constitutes acceptance of any changes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">2. About Vender</h2>
          <p>
            Vender is an online marketplace that connects independent brands and vendors with customers. We provide the platform and tools that enable vendors to list and sell their products, and customers to discover and purchase them. Vender acts as an intermediary and is not the seller of any products listed by vendors on the platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">3. Account Registration</h2>
          <p>
            To access certain features of the platform, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information during registration and keep your account information up to date. You must be at least 13 years old to create an account, and at least 18 years old to make purchases or sell on the platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">4. Customer Terms</h2>
          <p>
            As a customer, you agree to provide accurate shipping and billing information when placing orders. All purchases are subject to product availability and order confirmation. Prices are set by individual vendors and may change without notice. Payment is processed securely through Stripe at the time of purchase. You are responsible for any applicable taxes and shipping fees associated with your orders.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">5. Vendor Terms</h2>
          <p>
            Vendors must apply and be approved before listing products on Vender. By becoming a vendor, you agree to: provide accurate product descriptions, images, and pricing; fulfill orders promptly and provide tracking information; comply with all applicable laws and regulations regarding the products you sell; maintain adequate inventory for listed products; and respond to customer inquiries in a timely manner.
          </p>
          <p className="mt-3">
            Vender charges a platform commission on each sale. Payouts are processed through Stripe Connect on a bi-weekly basis. Vender reserves the right to suspend or terminate vendor accounts that violate these terms, receive consistent negative feedback, or engage in fraudulent activity.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">6. Prohibited Activities</h2>
          <p>
            You agree not to: use the platform for any unlawful purpose; sell counterfeit, stolen, or prohibited items; manipulate reviews, ratings, or sales figures; interfere with or disrupt the platform or its servers; attempt to gain unauthorized access to other user accounts; use automated tools to scrape or collect data from the platform; or engage in any activity that could harm Vender, its users, or its reputation.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">7. Returns and Refunds</h2>
          <p>
            Individual vendors set their own return and refund policies, which are displayed on their product listings. Vender facilitates communication between customers and vendors regarding returns and refunds but is not directly responsible for processing them. If a dispute cannot be resolved between the customer and vendor, Vender may step in to mediate at its discretion.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">8. Intellectual Property</h2>
          <p>
            The Vender platform, including its design, logos, and content, is owned by Vender and protected by intellectual property laws. Vendors retain ownership of their product images and descriptions but grant Vender a non-exclusive license to display this content on the platform and in marketing materials. You may not reproduce, distribute, or create derivative works from any content on the platform without express written permission.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">9. Limitation of Liability</h2>
          <p>
            Vender provides the platform on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We make no warranties, express or implied, regarding the platform&apos;s reliability, availability, or fitness for a particular purpose. Vender is not liable for any direct, indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to damages resulting from transactions between customers and vendors.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">10. Dispute Resolution</h2>
          <p>
            Any disputes arising from or related to these Terms of Service shall be resolved through good-faith negotiation. If a resolution cannot be reached, disputes will be submitted to binding arbitration in accordance with applicable laws. You agree to waive any right to participate in class action lawsuits or class-wide arbitration against Vender.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">11. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the platform at our sole discretion, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, vendors, Vender, or third parties. Upon termination, your right to use the platform will immediately cease.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">12. Contact Us</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at <a href="mailto:support@vender.com" className="text-accent hover:underline">support@vender.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-warm-border">
        <Link href="/" className="text-sm text-accent hover:underline">&larr; Back to Home</Link>
      </div>
    </div>
  )
}
