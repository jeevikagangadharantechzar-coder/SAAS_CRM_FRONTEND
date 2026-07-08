import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearCredentials } from "../../store/authSlice";
import { disconnectSocket } from "../../utils/socket";
import { disconnectFreeTrialSocket } from "../../utils/freeTrialSocket";
import { useFreeTrial } from "../../context/FreeTrialContext";

// Global, non-dismissable "trial expired / upgrade" popup — mounted once at
// the app root (App.jsx) so it appears over every CRM page the moment the
// trial expires. Deliberately has no close (X) button and no backdrop-click
// dismissal: the only ways out are "Upgrade Plan Now" or "Logout".
const TrialExpiredModal = () => {
  const freeTrial = useFreeTrial();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { slug } = useSelector((state) => state.auth);

  if (!freeTrial?.trialExpired) return null;

  const expiryDate = freeTrial.expiredInfo?.meta?.expiryDate;
  const description =
    freeTrial.expiredInfo?.text ||
    "Your 14-day free trial has ended. Upgrade your plan to keep your CRM, data, and team active without interruption.";

  const handleUpgrade = () => {
    navigate(`/${slug}/upgrade`);
  };

  const handleLogout = () => {
    disconnectSocket();
    disconnectFreeTrialSocket();
    dispatch(clearCredentials());
    navigate(`/${slug}/login`);
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Your Free Trial Has Ended</h3>
        {expiryDate && (
          <span className="inline-block px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-semibold mb-3">
            Trial ended on {expiryDate}
          </span>
        )}
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleUpgrade}
            className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90 transition"
            style={{ backgroundColor: "#008ECC" }}
          >
            Upgrade Plan Now
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 rounded-lg font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialExpiredModal;
