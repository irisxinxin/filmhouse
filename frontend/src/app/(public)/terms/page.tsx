export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-display font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">Last updated: February 2026</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing and using the Filmhouse website and services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Ticket Purchases</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>All ticket sales are final. No refunds or exchanges unless a screening is cancelled.</li>
              <li>Tickets are non-transferable and valid only for the specified screening.</li>
              <li>Please arrive at least 15 minutes before the scheduled screening time.</li>
              <li>Latecomers may not be admitted after the film has started.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Age Restrictions</h2>
            <p className="text-gray-600">
              Films are rated according to Singapore&apos;s film classification system. Valid ID may be required for age-restricted films. We reserve the right to refuse entry if age requirements are not met.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cinema Conduct</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Mobile phones must be switched off or set to silent mode during screenings.</li>
              <li>Recording of any kind is strictly prohibited.</li>
              <li>Outside food and beverages are not permitted.</li>
              <li>We reserve the right to remove patrons who disrupt other guests.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Membership</h2>
            <p className="text-gray-600">
              Membership benefits are subject to change. Memberships are non-refundable and non-transferable. Benefits cannot be combined with other promotions unless stated otherwise.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-600">
              Filmhouse shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services. Our total liability shall not exceed the amount paid for the specific service in question.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Changes to Terms</h2>
            <p className="text-gray-600">
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to our website. Continued use of our services constitutes acceptance of modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact</h2>
            <p className="text-gray-600">
              For questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:hello@filmhouse.sg" className="text-primary hover:underline">
                hello@filmhouse.sg
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
