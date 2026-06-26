import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, Upload, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function GoogleIntegration() {
  const [status, setStatus] = useState({ connected: false, connectedAt: null });
  const [jsonText, setJsonText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/google-integration`, authHeader());
      setStatus(res.data);
    } catch {
      setStatus({ connected: false });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSave = async () => {
    if (!jsonText.trim()) return toast.error("Paste your service account JSON first");
    let credentials;
    try {
      credentials = JSON.parse(jsonText);
    } catch {
      return toast.error("Invalid JSON — check formatting");
    }
    try {
      setSaving(true);
      await axios.post(`${API_URL}/google-integration`, { credentials }, authHeader());
      toast.success("Google integration saved successfully");
      setJsonText("");
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove Google integration? Existing meetings will keep their Meet links.")) return;
    try {
      await axios.delete(`${API_URL}/google-integration`, authHeader());
      toast.success("Google integration removed");
      fetchStatus();
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Google Meet Integration</h1>
      <p className="text-sm text-gray-500 mb-6">
        Connect a Google Service Account so all users in this tenant can auto-generate Meet links
        when creating meetings — no OAuth consent screen required.
      </p>

      {/* Status */}
      <div
        className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${
          status.connected ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
        }`}
      >
        {status.connected ? (
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">
            {status.connected ? "Service Account Connected" : "Not Connected"}
          </p>
          {status.connectedAt && (
            <p className="text-xs text-gray-500">
              Connected on {new Date(status.connectedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {status.connected && (
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>

      {/* Collapsible Setup Guide */}
      <div className="border border-blue-100 rounded-xl mb-6 overflow-hidden">
        <button
          onClick={() => setShowSteps((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 text-sm font-semibold text-blue-800"
        >
          How to get your Service Account JSON
          {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showSteps && (
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 px-4 py-4 bg-white">
            <li>Go to <strong>Google Cloud Console</strong> → select your project</li>
            <li>Navigate to <strong>IAM &amp; Admin → Service Accounts</strong></li>
            <li>Click <strong>Create Service Account</strong>, give it any name, click Done</li>
            <li>Click the service account → <strong>Keys</strong> tab → <strong>Add Key → Create new key → JSON</strong></li>
            <li>A JSON file downloads automatically — open it and copy all contents</li>
            <li>Go to <strong>APIs &amp; Services → Library</strong> → search <strong>Google Calendar API</strong> → Enable it</li>
            <li>Paste the JSON below and click Save</li>
          </ol>
        )}
      </div>

      {/* JSON Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Service Account JSON
        </label>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  ...\n}'}
          rows={12}
          className="w-full border border-gray-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={handleSave}
          disabled={saving || !jsonText.trim()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          {saving ? "Saving..." : status.connected ? "Update Integration" : "Save Integration"}
        </button>
      </div>
    </div>
  );
}
