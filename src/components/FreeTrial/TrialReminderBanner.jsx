import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useFreeTrial } from "../../context/FreeTrialContext";

// Small dismissible top banner shown for the 7/3/1-day-left trial reminders.
// Not a modal — the user can close it and keep working; the server only
// sends each milestone once, so it won't reappear on its own.
//
// Layout is deliberately split into title / description / date-pill instead
// of one long run-on sentence, so nothing gets clipped in a thin banner and
// the expiry date is always fully visible.
const TrialReminderBanner = () => {
  const freeTrial = useFreeTrial();
  const navigate = useNavigate();
  const { slug } = useSelector((state) => state.auth);

  if (!freeTrial?.reminder) return null;
  const { reminder, dismissReminder } = freeTrial;
  const daysLeft = reminder.meta?.daysLeft;
  const expiryDate = reminder.meta?.expiryDate;

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 leading-snug">
              {daysLeft ? `${daysLeft} Day${daysLeft === 1 ? "" : "s"} Left in Your Free Trial` : reminder.title}
            </p>
            <p className="text-sm text-amber-800/90 leading-snug">
              {reminder.text || reminder.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto pl-12 sm:pl-0">
          {expiryDate && (
            <span className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/80 border border-amber-300 text-amber-800 text-xs font-semibold">
              Ends {expiryDate}
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate(`/${slug}/upgrade`)}
            className="whitespace-nowrap px-4 py-1.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: "#008ECC" }}
          >
            Upgrade Now
          </button>
          <button
            type="button"
            onClick={dismissReminder}
            aria-label="Dismiss"
            className="text-amber-500 hover:text-amber-700 transition p-1.5 rounded-full hover:bg-white/60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialReminderBanner;
