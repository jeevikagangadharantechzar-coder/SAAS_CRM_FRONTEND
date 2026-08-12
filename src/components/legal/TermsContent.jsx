import React from "react";

// PLACEHOLDER — pending legal review.
//
// No usable Terms & Conditions copy exists for TZI CRM yet. The only prior
// draft (CRM-Website/app/terms-and-conditions/page.tsx) was a hardware/IoT
// SaaS template flagged as unusable by CRM-Website/TERMS-AND-CONDITIONS-REVIEW.md.
// Replace the body below with reviewed, CRM-specific Terms & Conditions text —
// this is the only file that needs to change to do so.
export default function TermsContent() {
  const companyName = "Techzar Info";
  const appName = "TZI CRM";

  return (
    <>
      <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <strong>⚠ Placeholder — pending legal review.</strong> This is not final
        Terms &amp; Conditions text. Replace this content before relying on it
        as a binding agreement.
      </div>

      <div className="mb-8 pb-6 border-b border-gray-100">
        <h1 className="text-gray-900 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-500">
          This document will govern use of {appName}, operated by {companyName}.
        </p>
      </div>

      <div className="space-y-8 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-slate-900 mb-3">1. Acceptance of Terms</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">2. Description of Service</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">3. Accounts, Tenants &amp; Users</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">4. Subscription, Trial, Billing &amp; Taxes</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">5. Customer Data Ownership &amp; License</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">6. Acceptable Use</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">7. Third-Party Integrations</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">8. Confidentiality &amp; Data Protection</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">9. Termination &amp; Suspension</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">10. Warranties, Disclaimers &amp; Limitation of Liability</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">11. Governing Law &amp; Jurisdiction</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">12. Changes to Terms</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
        <section>
          <h2 className="text-slate-900 mb-3">13. Contact Information</h2>
          <p>[Placeholder — to be drafted.]</p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {companyName}. All rights reserved.
      </div>
    </>
  );
}
