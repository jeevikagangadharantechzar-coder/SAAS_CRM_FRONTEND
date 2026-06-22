import { useState, useCallback } from "react";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [lossNotes, setLossNotes] = useState("");
  const [dealId, setDealId] = useState(null);
  const [dealName, setDealName] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetModal = useCallback(() => {
    setLossReason("");
    setLossNotes("");
    setValidationError("");
    setDealId(null);
    setDealName("");
    setPendingAction(null);
    setIsLoading(false);
  }, []);

  const openModal = useCallback((deal, action) => {
    console.log("Opening modal for deal:", deal);
    // Handle both cases: if deal is an object with _id, or just an id string
    if (typeof deal === 'object' && deal !== null) {
      setDealId(deal._id);
      setDealName(deal.dealName || "");
    } else {
      setDealId(deal);
      setDealName("");
    }
    setPendingAction(() => action);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setTimeout(resetModal, 300);
  }, [resetModal]);

  const validateAndExecute = useCallback(async () => {
    console.log("Validating modal data:", { lossReason, lossNotes, dealId });
    
    // Clear previous validation error
    setValidationError("");
    
    // Validate loss reason
    if (!lossReason || lossReason.trim() === "") {
      setValidationError("Please select a loss reason");
      return false;
    }

    if (!dealId) {
      console.error("No deal ID found");
      setValidationError("Deal reference missing");
      return false;
    }

    // If validation passes, execute the pending action
    if (pendingAction && typeof pendingAction === "function") {
      const lossData = {
        dealId,
        reason: lossReason.trim(),
        notes: lossNotes.trim()
      };
      console.log("Executing pending action with data:", lossData);
      
      try {
        setIsLoading(true);
        // Call the pending action (which might be async)
        await pendingAction(lossData);
        closeModal();
        return true;
      } catch (error) {
        console.error("Error executing pending action:", error);
        setValidationError(error.message || "Failed to process request");
        return false;
      } finally {
        setIsLoading(false);
      }
    } else {
      console.error("No pending action set");
      setValidationError("Internal error: No callback function");
      return false;
    }
  }, [lossReason, lossNotes, dealId, pendingAction, closeModal]);

  // Manual validation setter for external use
  const setExternalValidationError = useCallback((error) => {
    setValidationError(error);
  }, []);

  return {
    modalOpen,
    lossReason,
    lossNotes,
    validationError,
    LOSS_REASONS,
    isLoading,
    dealId,
    dealName,
    setLossReason,
    setLossNotes,
    openModal,
    closeModal,
    validateAndExecute,
    resetModal,
    setIsLoading,
    setValidationError: setExternalValidationError,
  };
}