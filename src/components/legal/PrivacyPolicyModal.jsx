import React, { useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "../ui/dialog";
import PrivacyPolicyContent from "./PrivacyPolicyContent";

const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";

// First-login gate: shown before TermsModal. Not read-gated — only Terms
// requires scrolling to the end before it can be accepted.
export default function PrivacyPolicyModal({ open, token, tenantSlug, onAccepted }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await axios.post(
        `${SI_URI}/${tenantSlug}/api/agreements/accept`,
        { agreementType: "privacy_policy" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onAccepted();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Privacy Policy</DialogTitle>
        <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
          <PrivacyPolicyContent />
        </div>
        <DialogFooter className="p-6 pt-4 border-t border-gray-100">
          {error && <p className="text-sm text-red-600 mr-auto self-center">{error}</p>}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg font-medium text-white hover:opacity-90 transition disabled:opacity-60"
            style={{ backgroundColor: "#008ECC" }}
          >
            {isSubmitting ? "Please wait..." : "Continue"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
