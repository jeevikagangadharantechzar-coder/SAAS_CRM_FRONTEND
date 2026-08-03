import { useState, useCallback, useRef } from "react";
import axios from "axios";
import ModalLoss from "./ModalLoss";

/* ──Fields For Loss Reason Modal ─────────────────────── */
const LOSS_REASONS = [
  "Price too high",
  "No follow-up",
  "Competitor chosen",
  "No client decision",
  "Requirements mismatch",
  "Budget constraints",
  "Timing issues",
  "Lost to internal solution",
  "Poor product fit",
  "Communication breakdown",
  "Ghosted/No Reply",
  "Feature Missing",
  "Competitor (Zoho)",
];

export default function useLostDealModal() {
  // ── State (for UI rendering) ──────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [lossNotes, setLossNotes] = useState("");
  const [dealId, setDealId] = useState(null);
  const [dealName, setDealName] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Refs (always have the LIVE latest value — no stale closure) ──────────
  // validateAndExecute reads from these, not from state, so the first click
  // always works even if React hasn't re-rendered yet with the latest values.
  const lossReasonRef = useRef("");
  const lossNotesRef = useRef("");
  const dealIdRef = useRef(null);
  const pendingActionRef = useRef(null);
  const resetTimerRef = useRef(null);

  // ── Wrapped setters that keep state + ref in sync ─────────────────────────
  const setLossReasonSync = useCallback((val) => {
    lossReasonRef.current = val;
    setLossReason(val);
  }, []);

  const setLossNotesSync = useCallback((val) => {
    lossNotesRef.current = val;
    setLossNotes(val);
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetModal = useCallback(() => {
    lossReasonRef.current = "";
    lossNotesRef.current = "";
    dealIdRef.current = null;
    pendingActionRef.current = null;
    setLossReason("");
    setLossNotes("");
    setValidationError("");
    setDealId(null);
    setDealName("");
    setIsLoading(false);
  }, []);

  // ── Open ──────────────────────────────────────────────────────────────────
  const openModal = useCallback((deal, action) => {
    console.log("Opening modal for deal:", deal);

    // Cancel any in-flight reset timer so it can't wipe state after re-open.
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    // Always start fresh — reset both refs and state synchronously.
    lossReasonRef.current = "";
    lossNotesRef.current = "";
    pendingActionRef.current = null;
    setLossReason("");
    setLossNotes("");
    setValidationError("");

    // Ignore React synthetic event objects (direct onClick={openModal}).
    if (deal && (deal.nativeEvent || typeof deal.preventDefault === "function")) {
      dealIdRef.current = null;
      setDealId(null);
      setDealName("");
      setModalOpen(true);
      return;
    }

    if (typeof deal === "object" && deal !== null) {
      dealIdRef.current = deal._id || null;
      setDealId(deal._id || null);
      setDealName(deal.dealName || "");
      if (deal.lossReason) {
        lossReasonRef.current = deal.lossReason;
        setLossReason(deal.lossReason);
      }
      if (deal.lossNotes) {
        lossNotesRef.current = deal.lossNotes;
        setLossNotes(deal.lossNotes);
      }
    } else {
      dealIdRef.current = deal || null;
      setDealId(deal || null);
      setDealName("");
    }

    if (typeof action === "function") {
      pendingActionRef.current = action;
    }

    setModalOpen(true);
  }, []);

  // ── Close ─────────────────────────────────────────────────────────────────
  const closeModal = useCallback(() => {
    setModalOpen(false);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(resetModal, 300);
  }, [resetModal]);

  // ── Validate & Execute ────────────────────────────────────────────────────
  // Reads from refs so it always sees the LATEST values even on the very
  // first click — no stale-closure issues regardless of render timing.
  const validateAndExecute = useCallback(async () => {
    const currentReason = lossReasonRef.current;
    const currentNotes = lossNotesRef.current;
    const currentDealId = dealIdRef.current;
    const currentAction = pendingActionRef.current;

    console.log("Validating modal data:", { currentReason, currentNotes, currentDealId });

    setValidationError("");

    // Accept dropdown selection OR typed text as the reason.
    const effectiveReason =
      currentReason && currentReason.trim() !== ""
        ? currentReason.trim()
        : currentNotes && currentNotes.trim() !== ""
        ? currentNotes.trim()
        : "";

    if (!effectiveReason) {
      setValidationError("Please select or enter a reason");
      return false;
    }

    if (!currentDealId) {
      console.error("No deal ID found");
      setValidationError("Deal reference missing");
      return false;
    }

    const lossData = {
      dealId: currentDealId,
      reason: effectiveReason,
      notes: currentNotes.trim(),
    };

    try {
      setIsLoading(true);

      // If we are creating a NEW deal, the deal doesn't exist in the DB yet!
      // We must skip the /deals/lost-reason API call and just let the pendingAction
      // (from CreateDeal.jsx) submit the full deal payload to the creation endpoint.
      if (currentDealId === "new-deal") {
        if (currentAction && typeof currentAction === "function") {
          console.log("Executing onSuccess callback for new deal with data:", lossData);
          await currentAction(lossData);
        }
        closeModal();
        return true;
      }

      const API_URL = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem("token");
      
      // ALWAYS call the API from this centralized modal hook for existing deals.
      // This reduces duplicate code across files.
      await axios.post(
        `${API_URL}/deals/lost-reason`,
        lossData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // If a callback was provided, execute it (e.g. to update local state)
      if (currentAction && typeof currentAction === "function") {
        console.log("Executing onSuccess callback with data:", lossData);
        await currentAction(lossData);
      }

      closeModal();
      return true;
    } catch (error) {
      console.error("Error saving lost deal reason:", error);
      setValidationError(
        error.response?.data?.message || error.message || "Failed to process request"
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [closeModal]); // stable — reads live values from refs, not from closure

  const setExternalValidationError = useCallback((error) => {
    setValidationError(error);
  }, []);

  // ── Unified Modal Renderer ────────────────────────────────────────────────
  // Call this as {renderModal()} in JSX to prevent unmounting/focus loss!
  const renderModal = () => (
    <ModalLoss
      isOpen={modalOpen}
      onClose={closeModal}
      lossReason={lossReason}
      lossNotes={lossNotes}
      validationError={validationError}
      LOSS_REASONS={LOSS_REASONS}
      onReasonChange={setLossReasonSync}
      onNotesChange={setLossNotesSync}
      onConfirm={validateAndExecute}
      title="Reason for Lost Deal"
      confirmText="Confirm & Move to Closed Lost"
      cancelText="Cancel"
      dealName={dealName}
      isLoading={isLoading}
    />
  );

  return {
    modalOpen,
    lossReason,
    lossNotes,
    validationError,
    LOSS_REASONS,
    isLoading,
    dealId,
    dealName,
    setLossReason: setLossReasonSync,
    setLossNotes: setLossNotesSync,
    openModal,
    closeModal,
    validateAndExecute,
    resetModal,
    setIsLoading,
    setValidationError: setExternalValidationError,
    renderModal, // Call as {renderModal()} in your JSX!
  };
}