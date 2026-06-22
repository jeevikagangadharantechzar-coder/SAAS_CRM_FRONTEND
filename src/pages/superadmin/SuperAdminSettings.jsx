import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Save, Shield, ShieldCheck, Database, Sliders, Globe } from "lucide-react";

const SuperAdminSettings = () => {
  const [platformName, setPlatformName] = useState("TZI CRM SaaS Platform");
  const [supportEmail, setSupportEmail] = useState("support@tzi-platform.com");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowSignups, setAllowSignups] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(24);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToastMessage("System configurations updated successfully.");
      setTimeout(() => setToastMessage(""), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Settings</h2>
        <p className="text-slate-500 text-sm">Fine-tune global platform security, performance, and variables.</p>
      </div>

      {toastMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-semibold flex items-center space-x-2">
          <ShieldCheck size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Brand Settings */}
        <Card className="border-0 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center space-x-2">
              <Globe size={18} className="text-[#008ecc]" />
              <span>General Configurations</span>
            </CardTitle>
            <CardDescription>Customize platform name and user support details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Global Support Contact Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access and Sign-ups */}
        <Card className="border-0 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center space-x-2">
              <Sliders size={18} className="text-[#008ecc]" />
              <span>Registration & Tenant Provisioning</span>
            </CardTitle>
            <CardDescription>Control how new business instances register onto the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Allow Signups */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Public Self-Service Registration</h4>
                <p className="text-xs text-slate-500 mt-0.5">Allow users to register new companies from landing pages.</p>
              </div>
              <button
                type="button"
                onClick={() => setAllowSignups(!allowSignups)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                  allowSignups ? "bg-[#008ecc]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    allowSignups ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Maintenance Mode */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800">System Maintenance Mode</h4>
                <p className="text-xs text-slate-500 mt-0.5">Block user access and show custom database maintenance banners.</p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                  maintenanceMode ? "bg-red-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    maintenanceMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Security & Backup */}
        <Card className="border-0 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center space-x-2">
              <Shield size={18} className="text-[#008ecc]" />
              <span>Platform Security & Session</span>
            </CardTitle>
            <CardDescription>Configure security protocols and JWT session expiry times.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  JWT Expiry Limit (Hours)
                </label>
                <span className="text-sm font-bold text-slate-800">{sessionTimeout} hrs</span>
              </div>
              <input
                type="range"
                min={1}
                max={168}
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#008ecc]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Maximum token lifetime. Once reached, users will be logged out automatically.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <div className="flex items-center space-x-3 text-slate-700">
                <Database size={20} className="text-slate-500" />
                <div>
                  <h4 className="text-sm font-bold">Automated Database Backups</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Scheduled daily platform backup snapshots.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                Active & Healthy
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save size={18} />
            <span>{saving ? "Saving Changes..." : "Save Configurations"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SuperAdminSettings;
