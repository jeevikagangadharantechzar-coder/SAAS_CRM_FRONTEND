import React from "react";

// Shared body content for the Terms & Conditions — rendered both by the
// standalone /terms-and-conditions page and the first-login TermsModal, so
// both always show identical, complete text.
export default function TermsContent() {
  return (
    <>
      <div className="mb-8 pb-6 border-b border-gray-100">
        <h1 className="text-gray-900 mb-1">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-600">TZI-CRM — a product of TechZarInfo Software Solutions PVT LTD</p>
        <p className="text-sm text-gray-500 mt-2">Effective date: 6 August 2026 | Last updated: 12 August 2026</p>
      </div>

      <div className="space-y-8 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-slate-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern access to and use of the TZI-CRM customer
            relationship management platform (the &ldquo;Service&rdquo;) provided by TechZarInfo Software
            Solutions PVT LTD (&ldquo;TZI-CRM,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). By creating an account,
            or by using the Service in any way, the organization on whose behalf you act (&ldquo;Customer,&rdquo;
            &ldquo;you&rdquo;) and each individual user you authorize (&ldquo;User&rdquo;) agree to be bound by
            these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">2. Description of Service</h2>
          <p>
            TZI-CRM is a cloud-based, multi-tenant CRM software platform providing lead and deal/pipeline
            management, contact management, invoicing and proposals, task and target management, team calendar,
            reporting, and messaging integrations across email (including Gmail), WhatsApp, Instagram, and
            Facebook, as well as optional live team location tracking for field/sales staff. The Service is
            provided on a subscription basis as described in Section 4. No physical hardware, equipment, or
            devices are sold, shipped, or licensed under these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">3. Accounts, Tenants &amp; Users</h2>
          <p className="mb-2">
            Customer registers as a &ldquo;Tenant&rdquo; and designates one or more Admins. The Tenant Admin is
            responsible for:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Inviting and managing Users, and assigning appropriate roles/permissions;</li>
            <li>Ensuring Users comply with these Terms;</li>
            <li>Approving or rejecting new device login requests (see the Privacy Policy, Section 6);</li>
            <li>
              Maintaining the confidentiality of login credentials — credentials must not be shared between
              Users, and each individual accessing the Service must have their own account within the limits of
              the Tenant&rsquo;s licensed seat count.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">4. Subscription, Free Trial, Billing &amp; Taxes</h2>

          <h3 className="text-slate-800 font-semibold mb-1">4.1 Free trial</h3>
          <p className="mb-3">
            New Tenants receive a free trial period (currently 14 days, subject to change). At the end of the
            trial, if no active paid plan is in place, the account moves to a restricted &ldquo;grace&rdquo;
            status and then to &ldquo;expired&rdquo; status, during which access to the Service may be limited or
            suspended until a paid plan is activated.
          </p>

          <h3 className="text-slate-800 font-semibold mb-1">4.2 Billing cycles</h3>
          <p className="mb-3">
            Plans are available on monthly, half-yearly, yearly, or one-time billing cycles as selected at signup
            or upgrade. Billing is currently handled manually by invoice — TZI-CRM does not process payments
            through an integrated payment gateway. Invoices are issued to the Tenant&rsquo;s billing contact and
            marked &ldquo;paid,&rdquo; &ldquo;partially paid,&rdquo; or &ldquo;unpaid&rdquo; by our team upon
            receipt of payment via the agreed offline payment method (e.g., bank transfer). This section will be
            updated if automated online billing is introduced.
          </p>

          <h3 className="text-slate-800 font-semibold mb-1">4.3 Non-payment</h3>
          <p className="mb-3">
            If an invoice remains unpaid past its due date, we may move the Tenant&rsquo;s account to
            &ldquo;grace&rdquo; and then &ldquo;expired&rdquo; status, restricting or suspending access to the
            Service until payment is received. We do not take possession of, or assert any security interest in,
            any Customer property — suspension of Service access is the sole remedy for non-payment.
          </p>

          <h3 className="text-slate-800 font-semibold mb-1">4.4 Upgrades, downgrades &amp; proration</h3>
          <p className="mb-3">
            Customer may upgrade or downgrade its plan at any time through the Service or by contacting sales.
            Upgrades take effect immediately; charges are prorated for the remainder of the current billing
            cycle. Downgrades take effect at the start of the next billing cycle.
          </p>

          <h3 className="text-slate-800 font-semibold mb-1">4.5 Taxes</h3>
          <p className="mb-3">
            Fees are exclusive of applicable taxes. Customer is responsible for Goods and Services Tax (GST) and
            any other applicable Indian central, state, or local taxes, unless Customer provides a valid
            exemption certificate.
          </p>

          <h3 className="text-slate-800 font-semibold mb-1">4.6 Cancellation</h3>
          <p>
            Customer may cancel its subscription at any time, effective at the end of the current billing cycle.
            See Section 11 for what happens to Customer Data after cancellation.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">5. Customer Data Ownership &amp; License</h2>
          <p className="mb-3">
            As between the parties, Customer retains all right, title, and interest in and to the data Customer
            or its Users submit to the Service — including leads, deals, contacts, documents, invoices,
            proposals, messages, and other business records (&ldquo;Customer Data&rdquo;). TZI-CRM is granted
            only a limited, non-exclusive license to host, process, transmit, and display Customer Data solely to
            provide and support the Service.
          </p>
          <p className="mb-3">
            Upon termination or cancellation of a subscription, Customer may export Customer Data for 60 days,
            after which it will be deleted in accordance with the retention schedule in our Privacy Policy,
            unless a longer retention period is required by law.
          </p>
          <p>
            TZI-CRM separately owns all right, title, and interest in the Service itself — its software,
            platform, documentation, and any aggregated or de-identified data derived from use of the Service
            that does not identify Customer or any individual.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">6. Acceptable Use</h2>
          <p className="mb-2">Customer and its Users agree not to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Exceed the number of licensed User seats purchased, or share a single User&rsquo;s login
              credentials among multiple individuals;
            </li>
            <li>
              Use the Service&rsquo;s messaging features (email, WhatsApp, Instagram, or Facebook) to send
              unsolicited bulk or spam messages, or otherwise in violation of the WhatsApp Business Messaging
              Policy, Meta&rsquo;s Platform Terms, India&rsquo;s Information Technology Act, 2000, or other
              applicable anti-spam law;
            </li>
            <li>Scrape, bulk-export, or otherwise attempt to access another Tenant&rsquo;s data;</li>
            <li>
              Reverse-engineer, decompile, or attempt to extract the source code of the Service, except as
              permitted by law;
            </li>
            <li>Use the Service to store or transmit unlawful, infringing, or malicious content;</li>
            <li>Interfere with or disrupt the integrity or performance of the Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">7. Third-Party Integrations</h2>
          <p>
            The Service integrates with third-party platforms, including Meta&rsquo;s Graph API and WhatsApp
            Cloud API (for WhatsApp, Instagram, and Facebook messaging) and Google&rsquo;s OAuth/Gmail API (for
            email sync). By connecting these integrations, Customer authorizes TZI-CRM to access and process data
            from those platforms on Customer&rsquo;s behalf, as described in our Privacy Policy. Customer is
            responsible for complying with the applicable terms of those third-party platforms (e.g., WhatsApp
            Business Policy). TZI-CRM is not responsible for outages, API changes, or policy changes made by
            Meta, Google, or other third-party providers that affect the availability of related features.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">8. Confidentiality</h2>
          <p>
            Each party may receive confidential information of the other in connection with these Terms. Each
            party agrees to use the other&rsquo;s confidential information only to perform its obligations under
            these Terms, and to protect it with the same degree of care it uses for its own confidential
            information (and no less than reasonable care). Confidential information does not include information
            that is or becomes public through no fault of the receiving party, was already known to the receiving
            party, or is independently developed.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">9. Data Protection</h2>
          <p>
            Our collection, use, and protection of personal data — including Meta Platform Data, Gmail data,
            location data, and device/session data — is described in our Privacy Policy, which is incorporated
            into these Terms by reference. Both parties will comply with applicable data protection law,
            including India&rsquo;s Digital Personal Data Protection Act, 2023, in connection with their
            respective roles as described in the Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">10. Service Availability &amp; Support</h2>
          <p>
            We will use commercially reasonable efforts to make the Service available and to provide support in
            accordance with the plan Customer has subscribed to. Scheduled maintenance will be communicated in
            advance where practicable. The Service is provided on an &ldquo;as available&rdquo; basis, without
            guarantee of uninterrupted access; see Section 12 for disclaimers.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">11. Termination &amp; Suspension</h2>
          <p className="mb-3">
            We may suspend or terminate access to the Service (a) for non-payment, as described in Section 4.3,
            (b) for material breach of these Terms, including violations of Section 6 (Acceptable Use), or (c) as
            required by law. Customer may terminate by cancelling its subscription per Section 4.6.
          </p>
          <p>
            Upon termination for any reason, Customer&rsquo;s right to access the Service ends immediately, but
            Customer&rsquo;s right to export Customer Data survives for the period described in Section 5.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">12. Warranties &amp; Disclaimers</h2>
          <p>
            Except as expressly stated in these Terms, the Service is provided &ldquo;as is&rdquo; and &ldquo;as
            available,&rdquo; without warranties of any kind, whether express, implied, or statutory, including
            implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do
            not warrant that the Service will be uninterrupted, error-free, or completely secure.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">13. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, neither party will be liable for any indirect, incidental,
            special, consequential, or punitive damages, or for loss of profits, revenue, or data, arising out of
            or related to these Terms or the Service. Each party&rsquo;s total aggregate liability arising out of
            or related to these Terms will not exceed the fees paid by Customer to TZI-CRM in the 12 months
            preceding the claim. Nothing in this section limits liability that cannot be limited under applicable
            law, including for gross negligence or willful misconduct.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">14. Indemnification</h2>
          <p>
            Customer agrees to indemnify and hold TZI-CRM harmless from third-party claims arising out of (a)
            Customer Data, including any lack of lawful basis to process end-customer personal data entered into
            the Service, (b) Customer&rsquo;s or its Users&rsquo; violation of these Terms, or (c)
            Customer&rsquo;s misuse of third-party integrations described in Section 7.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">15. Governing Law &amp; Jurisdiction</h2>
          <p>
            These Terms are governed by the laws of India, without regard to conflict-of-law principles. The
            parties submit to the exclusive jurisdiction of the competent courts at Tiruchirappalli, Tamil Nadu,
            India.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">16. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be notified via email to Tenant
            Admins or an in-app notice at least 15 days before taking effect. Continued use of the Service after
            changes take effect constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 mb-3">17. Contact Information</h2>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p><strong>TechZarInfo Software Solutions PVT LTD</strong></p>
            <p>No.3D, M.S Tower, 4th Floor, Convent Rd, Cantonment, Tiruchirappalli – 620001, Tamil Nadu, India</p>
            <p className="mt-2">General/support inquiries: <a href="mailto:sales@techzarinfo.com" className="text-blue-600 hover:underline">sales@techzarinfo.com</a></p>
            <p>Sales inquiries: <a href="mailto:sales@techzarinfo.com" className="text-blue-600 hover:underline">sales@techzarinfo.com</a></p>
          </div>
        </section>
      </div>
    </>
  );
}
