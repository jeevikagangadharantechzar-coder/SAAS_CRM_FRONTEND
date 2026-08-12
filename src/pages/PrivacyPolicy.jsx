import React from "react";
import PrivacyPolicyContent from "../components/legal/PrivacyPolicyContent";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
        <PrivacyPolicyContent />
      </div>
    </div>
  );
}
