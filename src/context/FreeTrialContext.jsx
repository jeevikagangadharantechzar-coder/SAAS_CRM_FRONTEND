import { createContext, useContext, useEffect, useRef, useState } from "react";
import { initFreeTrialSocket } from "../utils/freeTrialSocket";
import { api } from "../services/api";

const FreeTrialContext = createContext(null);

// Mirrors services/freeTrialNotification.service.js REMINDER_COPY on the backend —
// duplicated because it's a different runtime, kept word-for-word so the banner
// reads the same whether it was hydrated from a live status fetch or a push event.
const REMINDER_COPY = {
  7: "Your 14-day free trial has one week left. You're off to a great start — upgrade now to keep everything running without interruption.",
  3: "Just 3 days remain on your free trial. Upgrade today so your team doesn't lose access to your data and workflow.",
  1: "Your free trial ends tomorrow. Upgrade now to keep your CRM active — it only takes a minute.",
};
const EXPIRED_COPY = "Your 14-day free trial has ended. Upgrade your plan to continue using the CRM.";

// Picks the same "nearest threshold" bucket as utils/trialDate.util.js's
// getDueTrialMilestone on the backend, so a live-fetched daysLeft that doesn't
// land exactly on 7/3/1 (e.g. checked mid-window) still shows sensible copy.
const bucketMilestone = (daysLeft) => [1, 3, 7].find((m) => daysLeft <= m) ?? null;

const buildReminderFromStatus = (status) => {
  if (!status?.isTrial || status.isExpired || status.daysLeft == null) return null;
  if (status.daysLeft > 7 || status.daysLeft <= 0) return null;
  const milestone = bucketMilestone(status.daysLeft);
  return {
    title: `${status.daysLeft} Day${status.daysLeft === 1 ? "" : "s"} Left in Your Free Trial`,
    text: REMINDER_COPY[milestone] || REMINDER_COPY[1],
    meta: { daysLeft: status.daysLeft, expiryDate: status.expiryDate },
  };
};

/* ── Free Trial Provider ───────────────────────────
   Tracks free-trial expiry state CRM-wide.

   The dedicated /free-trial socket namespace pushes instant milestone events,
   but that alone isn't reliable as the *source of truth* for what the banner
   shows: events fired while the tab is closed get queued server-side and
   replayed on reconnect, so on their own they can only ever tell you "the
   milestone that was due at some point in the past", not "the trial's actual
   current state". So on mount and on every socket (re)connect we also pull
   GET /trial-status, which is computed fresh from the tenant's live
   plan_end_date — that result always wins over anything older. */
export const FreeTrialProvider = ({ userId, children }) => {
  const [reminder, setReminder] = useState(null);
  const [expiredInfo, setExpiredInfo] = useState(null);
  const statusFetchSeq = useRef(0);

  const syncFromServer = async () => {
    const seq = ++statusFetchSeq.current;
    try {
      const { data } = await api.get("/trial-status");
      if (seq !== statusFetchSeq.current) return; // a newer sync already landed

      if (data.isExpired) {
        // Same shape as the live "trial_expired" socket payload (see
        // components/FreeTrial/TrialExpiredModal.jsx), so it doesn't matter
        // which source populated expiredInfo.
        setExpiredInfo({ text: EXPIRED_COPY, meta: { expiryDate: data.expiryDate } });
        setReminder(null);
      } else {
        setExpiredInfo(null);
        setReminder(buildReminderFromStatus(data));
      }
    } catch {
      // Not fatal — a live push event or the next reconnect will still update
      // things; the banner just stays whatever it last was.
    }
  };

  useEffect(() => {
    if (!userId) return;

    const socket = initFreeTrialSocket(userId);
    if (!socket) return;

    // A push event always reflects a real, just-happened milestone, so it's
    // safe to trust outright — including clearing a stale "expired" state
    // left over from an earlier test edit that has since been corrected.
    const handleReminder = (data) => {
      setExpiredInfo(null);
      setReminder(data);
    };
    const handleExpired = (data) => {
      setExpiredInfo(data || {});
      setReminder(null);
    };

    socket.on("trial_reminder", handleReminder);
    socket.on("trial_expired", handleExpired);
    socket.on("connect", syncFromServer);

    syncFromServer();

    return () => {
      socket.off("trial_reminder", handleReminder);
      socket.off("trial_expired", handleExpired);
      socket.off("connect", syncFromServer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const dismissReminder = () => setReminder(null);

  return (
    <FreeTrialContext.Provider value={{ reminder, trialExpired: !!expiredInfo, expiredInfo, dismissReminder }}>
      {children}
    </FreeTrialContext.Provider>
  );
};

export const useFreeTrial = () => useContext(FreeTrialContext);
