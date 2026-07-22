import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { useTranslation } from "react-i18next";
import { MODULE_CONFIG } from "./CustomListWidgetConfig";
import { LayoutDashboard, ListTodo, StickyNote, BarChart4, ArrowLeft, Trash2, PieChart, Table } from "lucide-react";

// Simple Toggle Switch
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

export const AddWidgetModal = ({ 
  isOpen, 
  onClose,
  customWidgets,
  setCustomWidgets,
  builtinWidgetsConfig,
  setBuiltinWidgetsConfig,
  dashboardNotes,
  setDashboardNotes
}) => {
  const { t } = useTranslation();
  
  // Steps: "select" | "minilist" | "standard"
  const [step, setStep] = useState("select");

  // Mini List State
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [selectedFields, setSelectedFields] = useState([]);
  const [widgetTitle, setWidgetTitle] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelectedModule("");
      setSelectedFilter("");
      setSelectedFields([]);
      setWidgetTitle("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedModule && MODULE_CONFIG[selectedModule]) {
      setSelectedFilter(MODULE_CONFIG[selectedModule].filters[0].value);
      setSelectedFields([]);
      setWidgetTitle(`Custom ${MODULE_CONFIG[selectedModule].label} List`);
    }
  }, [selectedModule]);

  const handleFieldToggle = (fieldValue) => {
    setSelectedFields((prev) => 
      prev.includes(fieldValue) ? prev.filter(f => f !== fieldValue) : [...prev, fieldValue]
    );
  };

  const handleSaveMiniList = () => {
    if (!selectedModule || !selectedFilter || selectedFields.length === 0) return;
    const newWidgetId = `custom_list_${Date.now()}`;
    setCustomWidgets([...customWidgets, {
      id: newWidgetId,
      type: "mini_list",
      title: widgetTitle,
      module: selectedModule,
      filter: selectedFilter,
      fields: selectedFields,
      visible: true
    }]);
    onClose();
  };

  const handleAddNote = () => {
    const newNoteId = `note_${Date.now()}`;
    setDashboardNotes([...dashboardNotes, {
      id: newNoteId,
      type: "note",
      title: "Sticky Note",
      content: "",
      visible: true
    }]);
    onClose();
  };

  const handleToggleBuiltin = (id) => {
    setBuiltinWidgetsConfig(builtinWidgetsConfig.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const handleToggleCustom = (id) => {
    setCustomWidgets(customWidgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const handleDeleteCustom = (id) => {
    setCustomWidgets(customWidgets.filter(w => w.id !== id));
  };

  const handleToggleNote = (id) => {
    setDashboardNotes(dashboardNotes.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const handleDeleteNote = (id) => {
    setDashboardNotes(dashboardNotes.filter(w => w.id !== id));
  };

  const renderSelectionStep = () => (
    <div className="grid grid-cols-2 gap-4 py-4">
      <button 
        onClick={() => setStep("standard")}
        className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all group"
      >
        <PieChart className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
        <span className="font-semibold text-gray-700 group-hover:text-blue-700">Standard Widgets</span>
      </button>

      <button 
        onClick={() => setStep("minilist")}
        className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all group"
      >
        <Table className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
        <span className="font-semibold text-gray-700 group-hover:text-blue-700">Custom Data Lists</span>
      </button>

      <button 
        onClick={handleAddNote}
        className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all group"
      >
        <StickyNote className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
        <span className="font-semibold text-gray-700 group-hover:text-blue-700">Sticky Note</span>
      </button>


    </div>
  );

  const renderStandardWidgets = () => (
    <div className="py-2 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">Default Widgets</h3>
        <div className="space-y-3">
          {builtinWidgetsConfig.map((widget) => (
            <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-medium text-gray-700">{widget.title}</span>
              <ToggleSwitch checked={widget.visible} onChange={() => handleToggleBuiltin(widget.id)} />
            </div>
          ))}
        </div>
      </div>

      {(customWidgets.length > 0 || dashboardNotes.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">Created Widgets</h3>
          <div className="space-y-3">
            {customWidgets.map((widget) => (
              <div key={widget.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">{widget.title}</span>
                  <span className="text-xs text-gray-500 capitalize">{widget.module} - {widget.filter}</span>
                </div>
                <div className="flex items-center gap-4">
                  <ToggleSwitch checked={widget.visible !== false} onChange={() => handleToggleCustom(widget.id)} />
                  <button onClick={() => handleDeleteCustom(widget.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {dashboardNotes.map((note) => (
              <div key={note.id} className="flex items-center justify-between p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                <span className="text-sm font-medium text-gray-800">Sticky Note</span>
                <div className="flex items-center gap-4">
                  <ToggleSwitch checked={note.visible !== false} onChange={() => handleToggleNote(note.id)} />
                  <button onClick={() => handleDeleteNote(note.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderMiniListConfig = () => (
    <div className="grid gap-5 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Module</label>
        <Select value={selectedModule} onValueChange={setSelectedModule}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select CRM Module" /></SelectTrigger>
          <SelectContent>
            {Object.entries(MODULE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedModule && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <label className="text-sm font-medium text-gray-700">Widget Title</label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={widgetTitle}
            onChange={(e) => setWidgetTitle(e.target.value)}
            placeholder="Enter custom title..."
          />
        </div>
      )}

      {selectedModule && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <label className="text-sm font-medium text-gray-700">Filter</label>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select Data Filter" /></SelectTrigger>
            <SelectContent>
              {MODULE_CONFIG[selectedModule].filters.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedModule && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Fields (Select exactly 3 for best fit)</label>
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
            {MODULE_CONFIG[selectedModule].fields.map((field) => (
              <div key={field.value} className="flex items-center space-x-2">
                <Checkbox 
                  id={`field-${field.value}`} 
                  checked={selectedFields.includes(field.value)}
                  onCheckedChange={() => handleFieldToggle(field.value)}
                />
                <label htmlFor={`field-${field.value}`} className="text-sm text-gray-600 cursor-pointer">{field.label}</label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-white border-0 shadow-2xl">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            {step !== "select" && (
              <button onClick={() => setStep("select")} className="text-gray-400 hover:text-gray-700 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <DialogTitle className="text-xl">
              {step === "select" ? "Choose Widget Type" : step === "standard" ? "Manage Widgets" : "Configure Mini List"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === "select" && renderSelectionStep()}
        {step === "standard" && renderStandardWidgets()}
        {step === "minilist" && renderMiniListConfig()}

        {step === "minilist" && (
          <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setStep("select")}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={handleSaveMiniList}
              disabled={!selectedModule || !selectedFilter || selectedFields.length === 0}
            >
              Add Widget
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
