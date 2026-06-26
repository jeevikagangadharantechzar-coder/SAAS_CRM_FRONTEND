import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Copy, CheckCircle, AlertCircle, Phone } from "react-feather";
import { toast } from "react-toastify";

export default function SulekhaIntegrationCard() {
  const { slug } = useSelector((state) => state.auth);
  const [copied, setCopied] = useState(false);

  // Generate the webhook URL
  // We use VITE_SI_URI if available (from api.js config), otherwise fallback to the current origin
  const baseUrl = import.meta.env.VITE_SI_URI || window.location.origin;
  
  // Construct the URL based on whether it's multi-tenant or not
  const webhookUrl = slug 
    ? `${baseUrl}/${slug}/api/sulekha/webhook`
    : `${baseUrl}/api/sulekha/webhook`;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      {/* Card Header */}
      <div className="flex items-center gap-4 p-5 border-b border-gray-100">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-100">
          <Phone size={24} className="text-red-500" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800 text-lg">Sulekha Lead Integration</h2>
          <p className="text-gray-500 text-sm">
            Capture incoming enquiries from Sulekha directly into your CRM.
          </p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        <p className="text-gray-700 text-sm mb-3">
          Your unique Webhook URL:
        </p>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-600 font-mono text-sm break-all">
            {webhookUrl}
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition ${
              copied 
                ? "bg-green-500 text-white hover:bg-green-600" 
                : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy URL"}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">How to set this up:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Copy the Webhook URL above.</li>
            <li>Contact your Sulekha Account Manager.</li>
            <li>Provide this URL and ask them to configure it for your <strong>Lead Webhook / Push API</strong>.</li>
            <li>Once configured, new enquiries will automatically appear in your Leads tab!</li>
          </ol>
        </div>
      </div>

      {/* Info Footer */}
      <div className="px-5 py-3 bg-red-50 border-t border-red-100 flex items-start gap-2">
        <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
        <p className="text-xs text-red-700">
          This is a zero-cost integration. Sulekha pushes the leads directly to your CRM without requiring premium API access.
        </p>
      </div>
    </div>
  );
}
