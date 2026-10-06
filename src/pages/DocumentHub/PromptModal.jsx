import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

const PromptModal = ({ isOpen, onClose, onSubmit, title, message, placeholder = "", submitText = "Submit", isDestructive = false }) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!inputValue.trim()) {
      setError("This field is required.");
      return;
    }
    setError("");
    onSubmit(inputValue.trim());
    setInputValue("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setInputValue("");
        setError("");
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {message && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {message}
            </p>
          )}
          <div>
            <textarea
              className={`w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm ${error ? "border-red-500" : "border-slate-300"}`}
              rows={3}
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError("");
              }}
            />
            {error && <span className="text-red-500 text-xs mt-1 block">{error}</span>}
          </div>
        </div>
        <DialogFooter>
          <button 
            onClick={() => {
              setInputValue("");
              setError("");
              onClose();
            }}
            className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className={`px-4 py-2 text-sm text-white rounded transition-colors ${
              isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {submitText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptModal;
