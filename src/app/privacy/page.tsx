import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="page-container py-12 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: February 2026</p>

      <div className="prose prose-sm text-gray-600 space-y-8">
        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">1. Introduction</h2>
          <p>
            Welcome to CutieValley. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and what rights you have in relation to it. By using our platform, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">2. Information We Collect</h2>
          <p>We collect information that you provide directly to us when you:</p>
          <p className="ml-4 mt-2">
            <strong>Create an account:</strong> name, email address, password, and profile picture.
          </p>
          <p className="ml-4">
            <strong>Make a purchase:</strong> billing address, shipping address, and payment information. Payment details are processed securely through Stripe and are never stored on our servers.
          </p>
          <p className="ml-4">
            <strong>Apply as a vendor:</strong> business name, business description, contact information, and banking details for payouts (processed through Stripe Connect).
          </p>
          <p className="ml-4">
            <strong>Browse the platform:</strong> we automatically collect device information, IP address, browser type, pages visited, and time spent on pages through cookies and similar technologies.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <p className="ml-4 mt-2">
            Provide, maintain, and improve the CutieValley platform; process transactions and send related information including purchase confirmations and invoices; send you technical notices, updates, security alerts, and support messages; respond to your comments, questions, and customer service requests; monitor and analyze trends, usage, and activities on our platform; and detect, investigate, and prevent fraudulent transactions and other illegal activities.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">4. Information Sharing</h2>
          <p>
            We do not sell your personal information to third parties. We share information only in the following circumstances: with vendors to fulfill your orders (shipping name and address only), with payment processors (Stripe) to complete transactions, with service providers who assist in operating our platform, and when required by law or to protect the rights and safety of CutieValley and its users.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your personal information. All data transmitted between your browser and our servers is encrypted using SSL/TLS. Payment information is handled entirely by Stripe, a PCI-DSS compliant payment processor, and is never stored on our infrastructure.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">6. Cookies</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our platform and hold certain information. Cookies are used to maintain your session, remember your preferences, and understand how you interact with our platform. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">7. Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal information at any time through your account settings. You may also request a copy of all data we hold about you, opt out of marketing communications, and request that we restrict processing of your personal information. To exercise any of these rights, please contact us using the information below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">8. Children&apos;s Privacy</h2>
          <p>
            Our platform is not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information promptly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &ldquo;Last updated&rdquo; date. You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-primary mb-3">10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@cutievalley.com" className="text-accent hover:underline">support@cutievalley.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-warm-border">
        <Link href="/" className="text-sm text-accent hover:underline">&larr; Back to Home</Link>
      </div>
    </div>
  )
}
