import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Trash2 } from "lucide-react";

// Simple Tailwind Toggle Switch Component
const ToggleSwitch = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? "bg-blue-600" : "bg-gray-200"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

export const CustomizeDashboardModal = ({ 
  isOpen, 
  onClose, 
  customWidgets, 
  setCustomWidgets,
  builtinWidgetsConfig,
  setBuiltinWidgetsConfig
}) => {

  const handleToggleBuiltin = (id) => {
    const updated = builtinWidgetsConfig.map((w) => 
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    setBuiltinWidgetsConfig(updated);
  };

  const handleToggleCustom = (id) => {
    const updated = customWidgets.map((w) => 
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    setCustomWidgets(updated);
  };

  const handleDeleteCustom = (id) => {
    const updated = customWidgets.filter((w) => w.id !== id);
    setCustomWidgets(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Customize Layout</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          
          {/* Default Widgets */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">Default Widgets</h3>
            <div className="space-y-3">
              {builtinWidgetsConfig.map((widget) => (
                <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">{widget.title}</span>
                  <ToggleSwitch 
                    checked={widget.visible} 
                    onChange={() => handleToggleBuiltin(widget.id)} 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Custom Widgets */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">Custom Widgets</h3>
            {customWidgets.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No custom widgets created yet.</p>
            ) : (
              <div className="space-y-3">
                {customWidgets.map((widget) => (
                  <div key={widget.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800">{widget.title}</span>
                      <span className="text-xs text-gray-500 capitalize">{widget.module} - {widget.filter}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <ToggleSwitch 
                        checked={widget.visible !== false} // Default to true if missing
                        onChange={() => handleToggleCustom(widget.id)} 
                      />
                      <button 
                        onClick={() => handleDeleteCustom(widget.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Delete Widget"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
