import React, { useState, useRef } from "react";
import { X, Phone, Upload, Mic } from "lucide-react";
import axios from "axios";

export default function ReportCallModal({ isOpen, onClose, targetId, baseUrl, headers, onSuccess }) {
  const [form, setForm] = useState({ companyName: "", callSummary: "", companyUrl: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.companyName.trim() || !form.callSummary.trim()) {
      setError("Company Name and Call Summary are required.");
      return;
    }

    const formData = new FormData();
    formData.append("companyName", form.companyName);
    formData.append("callSummary", form.callSummary);
    formData.append("companyUrl", form.companyUrl);
    if (file) {
      formData.append("recording", file);
    }

    setSaving(true);
    try {
      const reqHeaders = { ...headers };
      delete reqHeaders["Content-Type"];

      await axios.post(`${baseUrl}/targets/${targetId}/reports/call`, formData, { headers: reqHeaders });
      setSaving(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit call report");
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <Phone size={18} />
            </div>
            <div>
              <h2 className="text-gray-900 font-bold text-base">Report Call Made</h2>
              <p className="text-[11px] text-gray-500 font-medium">Log a new call for this target</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-2">{error}</div>}
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
            <input
              autoFocus
              type="text"
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none bg-gray-50/50 focus:bg-white"
              placeholder="e.g. Acme Corp"
              value={form.companyName}
              onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Company URL</label>
            <input
              type="url"
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none bg-gray-50/50 focus:bg-white"
              placeholder="https://example.com"
              value={form.companyUrl}
              onChange={(e) => setForm(f => ({ ...f, companyUrl: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Call Summary <span className="text-red-500">*</span></label>
            <textarea
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none bg-gray-50/50 focus:bg-white resize-none"
              placeholder="What was discussed?"
              value={form.callSummary}
              onChange={(e) => setForm(f => ({ ...f, callSummary: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Call Recording <span className="text-gray-400 font-normal text-xs">(Optional)</span></label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors flex flex-col items-center justify-center gap-2.5"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="audio/*,video/*" 
                onChange={handleFileChange} 
              />
              {file ? (
                <>
                  <Mic size={28} className="text-orange-500" />
                  <span className="text-sm font-bold text-gray-700 truncate w-full px-4">{file.name}</span>
                </>
              ) : (
                <>
                  <div className="p-2.5 bg-gray-100 rounded-full text-gray-400 mb-1">
                    <Upload size={20} />
                  </div>
                  <span className="text-sm font-semibold text-gray-600">Click to upload recording</span>
                  <span className="text-xs text-gray-400">Audio/Video up to 10MB</span>
                </>
              )}
            </div>
          </div>
        </form>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 disabled:opacity-50 rounded-xl transition-all flex items-center gap-2"
          >
            {saving ? "Saving..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
