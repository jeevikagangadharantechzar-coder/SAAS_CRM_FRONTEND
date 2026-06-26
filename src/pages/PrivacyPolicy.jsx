import React from "react";

export default function PrivacyPolicy() {
  const appName = "TZI CRM";
  const companyName = "Techzar Info";
  const contactEmail = "dev@techzarinfo.com";
  const website = "https://crm.techzarinfo.cloud";
  const effectiveDate = "June 26, 2026";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Effective Date: {effectiveDate}</p>
          <p className="text-sm text-gray-500 mt-1">
            This Privacy Policy applies to {appName} operated by {companyName}.
          </p>
        </div>

        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information when you use {appName}:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Account information:</strong> Name, email address, and password when you register.</li>
              <li><strong>Google account data:</strong> When you connect your Google account, we access your Google Calendar to create meeting events and generate Google Meet links on your behalf.</li>
              <li><strong>Meeting data:</strong> Meeting titles, descriptions, dates, attendee emails, and video conference links you create within the app.</li>
              <li><strong>Usage data:</strong> Log data, browser type, and pages visited for app improvement purposes.</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use Google User Data</h2>
            <p className="mb-2">
              {appName} uses Google OAuth 2.0 to access your Google Calendar. Specifically, we request the
              <strong> calendar.events</strong> scope which allows us to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Create Google Calendar events on your behalf when you schedule a meeting in the CRM.</li>
              <li>Generate Google Meet video conference links automatically for your meetings.</li>
              <li>Update or cancel calendar events when you modify or cancel a meeting in the CRM.</li>
            </ul>
            <p className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
              <strong>We do not:</strong> read your existing calendar events, access your email, store your calendar data beyond what you create in our app, or share your Google data with any third party.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Store Your Data</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your Google OAuth tokens are stored securely in our encrypted database and are used solely to perform calendar operations on your behalf.</li>
              <li>Meeting data is stored in your organization's isolated database — no data is shared between tenants.</li>
              <li>We do not sell, rent, or share your personal data or Google user data with any third parties.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. You may disconnect your Google account
              at any time from the app settings, which removes your stored OAuth tokens immediately. You may also
              request complete deletion of your data by contacting us at <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">{contactEmail}</a>.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Third-Party Services</h2>
            <p>
              {appName} integrates with the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li><strong>Google Calendar API</strong> — to create meeting events and Meet links.</li>
              <li><strong>Google Meet</strong> — for video conferencing links embedded in meetings.</li>
            </ul>
            <p className="mt-2">
              Use of these services is governed by{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Google's Privacy Policy
              </a>.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Security</h2>
            <p>
              We implement industry-standard security measures including encrypted data transmission (HTTPS),
              secure token storage, and isolated per-tenant databases to protect your information.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Disconnect your Google account at any time from within the app.</li>
              <li>Revoke our app's access to your Google account via your{" "}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Google Account settings
                </a>.
              </li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with
              an updated effective date. Continued use of the app after changes constitutes acceptance of the
              updated policy.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <p><strong>{companyName}</strong></p>
              <p>Website: <a href={website} className="text-blue-600 hover:underline">{website}</a></p>
              <p>Email: <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">{contactEmail}</a></p>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
