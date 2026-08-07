import React, { useState, useEffect } from "react";
import { FaTimes, FaChevronDown, FaSpinner } from "react-icons/fa";

const REASONS = [
  "Price too high",
  "Went with a competitor",
  "Missing features/functionality",
  "No budget",
  "Timing is not right",
  "Not interested",
  "Poor fit",
  "Other"
];

const LeadLossModal = ({ isOpen, onClose, onSubmit, leadName, isJunk = false, isDowngrade = false, isSubmitting = false }) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setCustomReason("");
      setError("");
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason) {
      setError("Please select a reason.");
      return;
    }
    if (reason === "Other" && !customReason.trim()) {
      setError("Please provide a custom reason.");
      return;
    }

    setError("");
    onSubmit({
      reason,
      customReason: reason === "Other" ? customReason : null
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {isJunk ? "Mark Lead as Junk" : isDowngrade ? "Reason for moving to Cold" : "Mark Lead as Rejected"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Lead: <span className="font-semibold text-gray-700">{leadName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for {isJunk ? "Junking" : isDowngrade ? "Downgrade" : "Rejection"} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError("");
                  }}
                  className={`w-full p-3 border rounded-xl outline-none transition-all duration-200 bg-white appearance-none cursor-pointer ${
                    error ? "border-red-500 ring-1 ring-red-500" : "border-gray-200 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  } ${reason ? "text-gray-800" : "text-gray-500"}`}
                >
                  <option value="" disabled>-- Select a Reason --</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <FaChevronDown />
                </div>
              </div>
            </div>

            {reason === "Other" && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Please specify <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    setError("");
                  }}
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 resize-none"
                  placeholder="Type the exact reason here..."
                />
              </div>
            )}

            {error && <p className="text-red-500 text-sm mt-1 animate-pulse">{error}</p>}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-white bg-red-600 rounded-xl hover:bg-red-700 font-medium transition-colors shadow-lg shadow-red-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <FaSpinner className="animate-spin" />}
                {isSubmitting ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LeadLossModal;
