import React from "react";

// Shared body content for the Privacy Policy — rendered both by the standalone
// /privacy-policy page (src/pages/PrivacyPolicy.jsx) and the first-login
// PrivacyPolicyModal, so both always show identical, complete text.
//
// Based on the reviewed source document (effective date 6 August 2026).
// Remaining bracketed placeholders (e.g. Grievance Officer name) are
// intentionally left as-is until TZI-CRM confirms them — not resolved here.
export default function PrivacyPolicyContent() {
  return (
    <>
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-100">
        <h1 className="text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-600">TZI-CRM — a product of TechZarInfo Software Solutions PVT LTD</p>
        <p className="text-sm text-gray-500 mt-2">Effective date: 6 August 2026 | Last updated: 12 August 2026</p>

    
      </div>

      {/* Table of contents */}
      {/* <nav className="mb-8 p-4 bg-gray-50 rounded-lg text-sm">
        <p className="font-semibold text-slate-900 mb-2">Contents</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li><a href="#pp-s1" className="hover:underline">Who This Policy Covers, and Our Role</a></li>
          <li><a href="#pp-s2" className="hover:underline">Information We Collect</a></li>
          <li><a href="#pp-s3" className="hover:underline">Meta Platform Data (WhatsApp, Instagram, Facebook)</a></li>
          <li><a href="#pp-s4" className="hover:underline">Gmail / Google Account Data</a></li>
          <li><a href="#pp-s5" className="hover:underline">Location Data</a></li>
          <li><a href="#pp-s6" className="hover:underline">Device and Session Data</a></li>
          <li><a href="#pp-s7" className="hover:underline">How We Use Information</a></li>
          <li><a href="#pp-s8" className="hover:underline">Legal Basis and India's DPDP Act, 2023</a></li>
          <li><a href="#pp-s9" className="hover:underline">How We Share Information</a></li>
          <li><a href="#pp-s10" className="hover:underline">Data Retention</a></li>
          <li><a href="#pp-s11" className="hover:underline">Data Security and Multi-Tenant Isolation</a></li>
          <li><a href="#pp-s12" className="hover:underline">Requesting Deletion of Your Data</a></li>
          <li><a href="#pp-s13" className="hover:underline">Your Rights as a Data Principal</a></li>
          <li><a href="#pp-s14" className="hover:underline">Payment Information</a></li>
          <li><a href="#pp-s15" className="hover:underline">Children's Privacy</a></li>
          <li><a href="#pp-s16" className="hover:underline">Changes to This Policy</a></li>
          <li><a href="#pp-s17" className="hover:underline">Contact Us and Grievance Officer</a></li>
        </ol>
      </nav> */}

      <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

        {/* 1 */}
        <section id="pp-s1">
          <h2 className="text-slate-900 mb-3">1. Who This Policy Covers, and Our Role</h2>
          <p className="mb-3">
            This Privacy Policy explains how Techzar Infosystems ("TZI-CRM," "we," "us") collects, uses,
            stores, and shares information through the TZI-CRM customer relationship management platform
            (the "Service"), including its web application, APIs, and any connected mobile clients.
          </p>
          <p className="mb-3">
            TZI-CRM is a multi-tenant B2B SaaS product. Each customer organization that signs up ("Tenant,"
            "Customer," "you," if you are a Tenant Admin) creates an account and invites its own employees
            ("Users") to use the Service. Because of this structure, we act in two different roles:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 mb-3">
            <li><strong>Data controller</strong> — for account-level information about Tenants and Users:
              names, work emails, login credentials, device/session records, billing contacts, and support
              communications. We decide why and how this data is processed to operate and secure the
              Service.</li>
            <li><strong>Data processor (service provider)</strong> — for the business data a Tenant's Users
              enter about the Tenant's own customers and contacts: leads, deals, invoices, proposals,
              messages, and similar records ("Customer Data"). Here, the Tenant is the controller and
              determines what data is collected and why.</li>
          </ul>
          <p className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
            Tenant Admins are responsible for having a lawful basis to collect and process their end-customers'
            personal data within the CRM, including obtaining any consents required under the DPDP Act or
            other applicable law.
          </p>
          <p>
            If you are an end-customer whose details were entered into TZI-CRM by one of our Tenants (for
            example, a lead or contact), your relationship is with that Tenant, not with us. Please direct
            data requests to them; we will assist our Tenant in fulfilling such requests as their processor.
          </p>
        </section>

        {/* 2 */}
        <section id="pp-s2">
          <h2 className="text-slate-900 mb-3">2. Information We Collect</h2>

          <h3 className="text-slate-800 font-semibold mb-1">2.1 Account and Tenant Data</h3>
          <p className="mb-3">
            When a Tenant signs up and invites Users, we collect names, work email addresses, phone numbers,
            role/designation, password hashes, and organization details (company name, industry, team size).
          </p>

          <h3 className="text-slate-800 font-semibold mb-1">2.2 Customer Data</h3>
          <p className="mb-3">
            Leads, deals/pipeline records, contacts, tasks, targets, calendar events, proposals, and invoices
            that Users create within the Service. This is Customer Data as defined in our Terms &amp;
            Conditions and belongs to the Tenant, not to us.
          </p>

          <h3 className="text-slate-800 font-semibold mb-1">2.3 Communications Data</h3>
          <p className="mb-3">
            Messages sent and received through the Service's messaging features, including WhatsApp,
            Instagram, Facebook, and connected Gmail accounts (see Sections 3 and 4 for specifics), and
            internal notes/comments Users attach to records.
          </p>

          <h3 className="text-slate-800 font-semibold mb-1">2.4 Usage and Log Data</h3>
          <p>
            IP addresses, browser/device type, pages and features accessed, timestamps, and error/diagnostic
            logs, collected automatically to operate, secure, and improve the Service.
          </p>
        </section>

        {/* 3 */}
        <section id="pp-s3">
          <h2 className="text-slate-900 mb-3">3. Meta Platform Data (WhatsApp, Instagram, Facebook)</h2>
          <p className="mb-3">
            If a Tenant connects a WhatsApp Business, Instagram, or Facebook Page account, the Service uses
            Meta's Graph API and WhatsApp Cloud API to access and store:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
            <li>Messages, comments, and media (images, documents, etc.) exchanged through the connected channel;</li>
            <li>Sender contact information (name, phone number, or social handle) attached to those messages;</li>
            <li>Page/business access tokens necessary to keep the connection authenticated; and</li>
            <li>Records automatically created from incoming messages, such as new Leads generated from a chat or comment.</li>
          </ul>
          <p className="mb-3">
            This data is used solely to provide messaging and CRM functionality within the connecting
            Tenant's account — for example, so a sales rep can see and reply to a WhatsApp conversation from
            inside the CRM. It is not sold, and is not shared with third parties beyond what is necessary to
            operate the integration (i.e., with Meta itself, as the platform the message passed through) and
            standard service sub-processors described in Section 9.
          </p>
          <p>
            You may request deletion of Meta Platform Data associated with your account as described in
            Section 12 (Requesting Deletion of Your Data).
          </p>
        </section>

        {/* 4 */}
        <section id="pp-s4">
          <h2 className="text-slate-900 mb-3">4. Gmail / Google Account Data</h2>
          <p className="mb-3">
            If a User connects a Gmail account, the Service requests the following Google API scopes to
            power the CRM's Email Chat feature: reading messages, composing and sending messages, and
            modifying message state (e.g., marking as read, labeling) on the connected mailbox. Access and
            refresh tokens are stored to keep the connection active.
          </p>
          <p className="mb-3">
            We access, use, store, and share information received from Google APIs in accordance with the
            Google API Services User Data Policy, including the Limited Use requirements:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
            <li>Gmail data is used only to display, send, and organize your email within the Service's Email Chat feature — never for advertising or ad-related purposes;</li>
            <li>Gmail data is not transferred to third parties except as necessary to provide or improve user-facing features of the Service, to comply with law, or as part of a merger/acquisition (with continued protection of the data);</li>
            <li>No human at TZI-CRM reads Gmail content except (a) with your affirmative consent for a specific support request, (b) for security purposes such as investigating abuse, or (c) to comply with applicable law.</li>
          </ul>
          <p>
            You can disconnect your Gmail account at any time from your account settings, which revokes the
            stored token; Google account permissions can also be revoked directly at{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              myaccount.google.com/permissions
            </a>.
          </p>
        </section>

        {/* 5 */}
        <section id="pp-s5">
          <h2 className="text-slate-900 mb-3">5. Location Data</h2>
          <p className="mb-3">
            If a Tenant enables the Live Team Locations feature (available on eligible plans), the Service
            collects the GPS coordinates of a User's device approximately every 30 seconds while that User is
            logged in and the feature is active. This data is used solely to let the Tenant's Admin(s) view
            the real-time location of field/sales staff within that Tenant's account, and is displayed only
            to Admins within the same Tenant — it is never visible to other Tenants or shared outside your
            organization.
          </p>
          <p className="mb-3">
            Location data is retained on a rolling basis and purged automatically after [90 days — confirm
            actual configured retention with engineering], except where a longer period is required for
            legal or dispute purposes.
          </p>
          <p>
            If you are a Tenant Admin enabling this feature, you are responsible for notifying your employees
            that location tracking will occur and for obtaining any consent required under applicable labor
            and privacy law before turning it on. TZI-CRM will prompt Users for their device's native
            location permission, but does not independently verify that an employer has met its own
            notice/consent obligations.
          </p>
        </section>

        {/* 6 */}
        <section id="pp-s6">
          <h2 className="text-slate-900 mb-3">6. Device and Session Data</h2>
          <p>
            To keep accounts secure, we record information about each login session: device type (web or
            mobile), a device identifier generated on that device, a human-readable device label, IP address,
            and session status. New devices go through an approval flow — an existing Admin must approve a
            "Device Login Request" before a new device can access the account — and we log who approved or
            rejected each request and when.
          </p>
        </section>

        {/* 7 */}
        <section id="pp-s7">
          <h2 className="text-slate-900 mb-3">7. How We Use Information</h2>
          <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
            <li>To provide, operate, and maintain the Service (e.g., rendering your pipeline, sending messages, syncing email);</li>
            <li>To authenticate Users, secure accounts, and detect/prevent fraud or unauthorized access;</li>
            <li>To provide customer support and respond to inquiries;</li>
            <li>To send service-related communications (billing, trial/plan status, security alerts);</li>
            <li>To monitor, diagnose, and improve platform performance and reliability;</li>
            <li>To comply with legal obligations and enforce our Terms &amp; Conditions.</li>
          </ul>
          <p>
            We do not use Customer Data, Meta Platform Data, or Gmail data to train third-party AI/ML models,
            nor do we sell personal data.
          </p>
        </section>

        {/* 8 */}
        <section id="pp-s8">
          <h2 className="text-slate-900 mb-3">8. Legal Basis and India's DPDP Act, 2023</h2>
          <p className="mb-3">
            TZI-CRM is governed by the laws of India. Where the Service processes personal data of
            individuals located in India ("Data Principals"), we process that data consistent with the
            Digital Personal Data Protection Act, 2023 ("DPDP Act"), including by:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Processing account-level data (Section 2) on the basis of the contract necessary to provide the Service to our Tenants, and legitimate business purposes such as security and support;</li>
            <li>Relying on Tenants, as controllers of the Customer Data they enter, to establish their own lawful basis (typically consent or legitimate use) for processing their end-customers' personal data;</li>
            <li>Providing Data Principals the rights described in Section 13 below and a channel to raise grievances (Section 17).</li>
          </ul>
        </section>

        {/* 9 */}
        <section id="pp-s9">
          <h2 className="text-slate-900 mb-3">9. How We Share Information</h2>
          <p className="mb-3">
            We do not sell personal data. We share information only with the following categories of
            recipients:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-2 pr-4 font-semibold text-slate-900">Recipient</th>
                  <th className="py-2 font-semibold text-slate-900">Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Meta Platforms, Inc.</td>
                  <td className="py-2 align-top">Delivers WhatsApp/Instagram/Facebook messages via their Graph API and WhatsApp Cloud API (Section 3)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Google LLC</td>
                  <td className="py-2 align-top">Gmail API access for the Email Chat feature (Section 4)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Transactional email provider (SMTP)</td>
                  <td className="py-2 align-top">Delivers account, billing, and security notification emails</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Cloud hosting / database provider</td>
                  <td className="py-2 align-top">Hosts application infrastructure and per-tenant databases</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Professional advisors, auditors, or successors</td>
                  <td className="py-2 align-top">Only as necessary for legal compliance, or in connection with a merger, acquisition, or asset sale (with continued protection of the data)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Law enforcement / regulators</td>
                  <td className="py-2 align-top">Only where required by applicable law or valid legal process</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 10 */}
        <section id="pp-s10">
          <h2 className="text-slate-900 mb-3">10. Data Retention</h2>
          <div className="overflow-x-auto mb-3">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-2 pr-4 font-semibold text-slate-900">Data type</th>
                  <th className="py-2 font-semibold text-slate-900">Retention</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Customer Data (leads, deals, contacts, invoices, etc.)</td>
                  <td className="py-2 align-top">For the life of the Tenant's subscription; exportable for 60 days after cancellation, then deleted within 90 days of cancellation unless a longer period is required by law</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Meta Platform Data (messages, comments, media)</td>
                  <td className="py-2 align-top">Same as Customer Data above, or until you request earlier deletion (Section 12)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Gmail data (via Email Chat)</td>
                  <td className="py-2 align-top">Retained only as long as the Gmail connection remains active; deleted upon disconnection</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Location data</td>
                  <td className="py-2 align-top">Rolling [90-day] window, then purged automatically</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Device/session and security logs</td>
                  <td className="py-2 align-top">Up to 12 months after account closure, for security and fraud-investigation purposes</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 align-top whitespace-nowrap">Account data (Tenant/User records)</td>
                  <td className="py-2 align-top">For the life of the account; deleted or anonymized within 90 days of account closure, subject to legal holds</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            The periods above are TZI-CRM's recommended defaults; confirm against actual operational
            practice before publishing.
          </p>
        </section>

        {/* 11 */}
        <section id="pp-s11">
          <h2 className="text-slate-900 mb-3">11. Data Security and Multi-Tenant Isolation</h2>
          <p className="mb-3">
            We use industry-standard technical and organizational measures to protect information, including
            encryption in transit, access controls, and device-approval requirements for login (Section 6).
            Each Tenant's data is stored in a separate, physically isolated database rather than in shared
            tables filtered by tenant ID — providing strong isolation between customers' data at the
            infrastructure level.
          </p>
          <p>
            No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
          </p>
        </section>

        {/* 12 */}
        <section id="pp-s12">
          <h2 className="text-slate-900 mb-3">12. Requesting Deletion of Your Data</h2>
          <p className="mb-3">
            You may request deletion of your personal data, including data collected via WhatsApp,
            Instagram, Facebook, or Gmail integrations, by:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
            <li>Emailing <a href="mailto:sales@techzarinfo.com" className="text-blue-600 hover:underline">sales@techzarinfo.com</a> with the subject line "Data Deletion Request"; or</li>
            <li>If you are a Tenant Admin, using the relevant deletion controls in your account settings (where available).</li>
          </ul>
          <p className="mb-3">
            We will verify the request and complete deletion within a commercially reasonable time, except
            where we are required to retain certain data for legal, tax, or security purposes. If you
            contacted us through a connected Meta account, we will also honor deletion requests submitted via
            Meta's own data-deletion request flow, where applicable.
          </p>
          <p className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
            Recommended action: publish a dedicated, linkable Data Deletion Instructions page/URL — Meta's
            app review process requires one, and none currently exists.
          </p>
        </section>

        {/* 13 */}
        <section id="pp-s13">
          <h2 className="text-slate-900 mb-3">13. Your Rights as a Data Principal</h2>
          <p className="mb-2">Subject to applicable law (including the DPDP Act), you may have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
            <li>Access the personal data we hold about you;</li>
            <li>Correct inaccurate or incomplete data;</li>
            <li>Request erasure of your data, subject to Section 10;</li>
            <li>Withdraw consent, where processing is based on consent;</li>
            <li>Raise a grievance with our Grievance Officer (Section 17) and, if unresolved, with the Data Protection Board of India.</li>
          </ul>
          <p>
            To exercise these rights, contact us using the details in Section 17. If you are an end-customer
            of one of our Tenants, we recommend contacting that Tenant directly, as they control the data; we
            will support them in responding to your request.
          </p>
        </section>

        {/* 14 */}
        <section id="pp-s14">
          <h2 className="text-slate-900 mb-3">14. Payment Information</h2>
          <p>
            TZI-CRM does not currently process online card payments. Subscriptions are billed manually via
            invoice, and we do not collect or store credit card, debit card, or other card numbers. If online
            payment processing is introduced in the future, this section will be updated to name the payment
            processor used and confirm that full card numbers are tokenized by that processor and never
            stored by TZI-CRM directly.
          </p>
        </section>

        {/* 15 */}
        <section id="pp-s15">
          <h2 className="text-slate-900 mb-3">15. Children's Privacy</h2>
          <p>
            The Service is intended for business use by adults acting on behalf of their employer. It is not
            directed to, and we do not knowingly collect personal data from, individuals under the age of 18.
          </p>
        </section>

        {/* 16 */}
        <section id="pp-s16">
          <h2 className="text-slate-900 mb-3">16. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be notified via email
            to Tenant Admins or an in-app notice at least 15 days before taking effect. The "Last updated"
            date at the top of this page reflects the most recent revision.
          </p>
        </section>

        {/* 17 */}
        <section id="pp-s17">
          <h2 className="text-slate-900 mb-3">17. Contact Us and Grievance Officer</h2>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p><strong>Techzar Infosystems*</strong></p>
            <p>No.3D, M.S Tower, 4th Floor, Convent Rd, Cantonment, Tiruchirappalli – 620001, Tamil Nadu, India</p>
            <p className="mt-2">General/support inquiries: <a href="mailto:sales@techzarinfo.com" className="text-blue-600 hover:underline">sales@techzarinfo.com</a></p>
            <p>Sales inquiries: <a href="mailto:sales@techzarinfo.com" className="text-blue-600 hover:underline">sales@techzarinfo.com</a></p>
            <p className="mt-2">
              Grievance Officer (DPDP Act, 2023): [Name / designation to be appointed and published —
              required once TZI-CRM's data volume triggers this obligation, or as a best practice
              regardless], reachable at{" "}
              <a href="mailto:sales@techzarinfo.com" className="text-blue-600 hover:underline">sales@techzarinfo.com</a>.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
