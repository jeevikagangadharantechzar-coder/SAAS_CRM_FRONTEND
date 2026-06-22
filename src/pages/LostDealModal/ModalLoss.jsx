import React from "react";

const LostDealModal = ({
  isOpen,
  onClose,
  lossReason,
  lossNotes,
  validationError,
  LOSS_REASONS,
  onReasonChange,
  onNotesChange,
  onConfirm,
  title = "Reason for Lost Deal",
  confirmText = "Confirm & Move to Closed Lost",
  cancelText = "Cancel",
  dealName = "",
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    console.log("Modal confirm clicked");
    onConfirm();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
              {dealName && (
                <p className="text-sm text-gray-600 mt-1">Deal: {dealName}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Please select a reason for marking this deal as Closed Lost.
              <span className="text-red-500 ml-1">*Required</span>
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loss Reason <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition ${
                  validationError ? "border-red-300 ring-1 ring-red-300" : "border-gray-300"
                }`}
                value={lossReason}
                onChange={(e) => onReasonChange(e.target.value)}
                required
                disabled={isLoading}
              >
                <option value="">Select a reason</option>
                {LOSS_REASONS.map((reason, index) => (
                  <option key={index} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              {validationError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {validationError}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition resize-none"
                placeholder="Add any additional notes or details about why the deal was lost..."
                rows="3"
                value={lossNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                This information will help improve future sales strategies.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-300 focus:outline-none transition-colors font-medium ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LostDealModal;