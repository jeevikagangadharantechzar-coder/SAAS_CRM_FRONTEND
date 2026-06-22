import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export const PlanDeleteModal = ({ isOpen, onClose, onConfirm, planName, isDeleting }) => {
  const [confirmText, setConfirmText] = useState("");

  // Reset input text when modal closes/opens
  useEffect(() => {
    if (isOpen) {
      setConfirmText("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmText.toLowerCase() === "delete") {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={22} className="animate-bounce" />
            <h3 className="text-lg font-bold">Delete Subscription Plan</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800">
            <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Destructive Action Warning</h4>
              <p className="text-xs mt-1 leading-relaxed">
                Deleting the subscription plan <strong>{planName}</strong> is permanent. New tenants will not be able to subscribe to this plan. Tenants currently on this plan might experience billing disruptions.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Type <span className="font-bold text-red-600">"delete"</span> below to authorize:
            </label>
            <input
              type="text"
              placeholder="delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 font-mono text-center"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer text-sm"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmText.toLowerCase() !== "delete" || isDeleting}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer text-sm shadow-md flex items-center justify-center space-x-2"
            >
              {isDeleting ? "Deleting..." : "Wipe Plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanDeleteModal;
