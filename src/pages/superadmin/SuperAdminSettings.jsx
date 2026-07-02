import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import {
  Save,
  Globe,
  Mail,
  FileText,
  Bell,
  Upload,
  Loader2,
  RotateCcw,
} from "lucide-react";


const API_BASE = import.meta.env.VITE_SI_URI || "http://localhost:5000";
const SETTINGS_URL = `${API_BASE}/superadmin/api/settings`;
const LOGO_URL = `${SETTINGS_URL}/logo`;

function authHeaders() {
  const token = localStorage.getItem("superAdminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Default values for each section ──
const DEFAULTS = {
  platformName: "TZI CRM SaaS Platform",
  supportEmail: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpSecure: false,
  smtpFromName: "TZI Support",
  welcomeSubject: "Welcome to {{platformName}} — Your Login Credentials",
  welcomeBody: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to {{platformName}}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a73e8 0%,#0d47a1 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Welcome to {{platformName}}</h1>
              <p style="margin:8px 0 0;color:#c8dcff;font-size:14px;">Your workspace is ready</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;color:#333;font-size:16px;">Hi <strong>{{adminName}}</strong>,</p>
              <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.6;">Your CRM account has been created successfully. Below are your login credentials — please keep them safe and change your password after your first login.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border:1px solid #d0dcff;border-radius:8px;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 14px;font-size:13px;font-weight:600;color:#1a73e8;text-transform:uppercase;letter-spacing:0.8px;">Login Credentials</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#666;font-size:14px;width:90px;">Email</td>
                        <td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;">{{email}}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#666;font-size:14px;">Password</td>
                        <td style="padding:6px 0;"><span style="background:#fff;border:1px solid #d0dcff;border-radius:4px;padding:4px 12px;font-family:monospace;font-size:15px;color:#1a73e8;font-weight:700;letter-spacing:1px;">{{password}}</span></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="{{loginUrl}}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1a73e8 0%,#0d47a1 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:8px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(26,115,232,0.35);">Login to Dashboard →</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#888;font-size:13px;line-height:1.6;border-top:1px solid #eee;padding-top:20px;">For security, please change your password immediately after logging in.<br/>If you did not request this account, please contact your administrator.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafc;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">© {{year}} {{platformName}}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  upgradeAlertEnabled: true,
  upgradeAlertEmail: "",
};

// ── Small reset button used in each card header ──
const ResetButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all"
  >
    <RotateCcw size={13} />
    <span>Reset to Default</span>
  </button>
);

const SuperAdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoCleared, setLogoCleared] = useState(false);
  const fileRef = useRef();

  // Branding
  const [platformName, setPlatformName] = useState(DEFAULTS.platformName);
  const [supportEmail, setSupportEmail] = useState(DEFAULTS.supportEmail);

  // SMTP
  const [smtpHost, setSmtpHost] = useState(DEFAULTS.smtpHost);
  const [smtpPort, setSmtpPort] = useState(DEFAULTS.smtpPort);
  const [smtpUser, setSmtpUser] = useState(DEFAULTS.smtpUser);
  const [smtpPass, setSmtpPass] = useState(DEFAULTS.smtpPass);
  const [smtpSecure, setSmtpSecure] = useState(DEFAULTS.smtpSecure);
  const [smtpFromName, setSmtpFromName] = useState(DEFAULTS.smtpFromName);

  // Welcome email
  const [welcomeSubject, setWelcomeSubject] = useState(DEFAULTS.welcomeSubject);
  const [welcomeBody, setWelcomeBody] = useState(DEFAULTS.welcomeBody);

  // Upgrade alert
  const [upgradeAlertEnabled, setUpgradeAlertEnabled] = useState(DEFAULTS.upgradeAlertEnabled);
  const [upgradeAlertEmail, setUpgradeAlertEmail] = useState(DEFAULTS.upgradeAlertEmail);

  // ── Per-section reset handlers ──
  const resetBranding = () => {
    setPlatformName(DEFAULTS.platformName);
    setSupportEmail(DEFAULTS.supportEmail);
    setLogoPreview("");
    setLogoCleared(true);
    toast.info("Branding reset to default — click Save to apply");
  };

  const resetSmtp = () => {
    setSmtpHost(DEFAULTS.smtpHost);
    setSmtpPort(DEFAULTS.smtpPort);
    setSmtpUser(DEFAULTS.smtpUser);
    setSmtpPass(DEFAULTS.smtpPass);
    setSmtpSecure(DEFAULTS.smtpSecure);
    setSmtpFromName(DEFAULTS.smtpFromName);
    toast.info("SMTP reset to default — click Save to apply");
  };

  const resetWelcomeEmail = () => {
    setWelcomeSubject(DEFAULTS.welcomeSubject);
    setWelcomeBody(DEFAULTS.welcomeBody);
    toast.info("Welcome email reset to default — click Save to apply");
  };

  const resetUpgradeAlerts = () => {
    setUpgradeAlertEnabled(DEFAULTS.upgradeAlertEnabled);
    setUpgradeAlertEmail(DEFAULTS.upgradeAlertEmail);
    toast.info("Upgrade alerts reset to default — click Save to apply");
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(SETTINGS_URL, {
          headers: authHeaders(),
        });
        setPlatformName(data.platformName || DEFAULTS.platformName);
        setSupportEmail(data.supportEmail || DEFAULTS.supportEmail);
        setSmtpHost(data.smtpHost || DEFAULTS.smtpHost);
        setSmtpPort(data.smtpPort || DEFAULTS.smtpPort);
        setSmtpUser(data.smtpUser || DEFAULTS.smtpUser);
        setSmtpPass(data.smtpPass || DEFAULTS.smtpPass);
        setSmtpSecure(data.smtpSecure || DEFAULTS.smtpSecure);
        setSmtpFromName(data.smtpFromName || DEFAULTS.smtpFromName);
        setWelcomeSubject(data.welcomeSubject || DEFAULTS.welcomeSubject);
        setWelcomeBody(data.welcomeBody || DEFAULTS.welcomeBody);
        setUpgradeAlertEnabled(data.upgradeAlertEnabled ?? DEFAULTS.upgradeAlertEnabled);
        setUpgradeAlertEmail(data.upgradeAlertEmail || DEFAULTS.upgradeAlertEmail);
        if (data.platformLogo) {
          setLogoPreview(`${API_BASE}/${data.platformLogo}`);
        }
      } catch (err) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        platformName,
        supportEmail,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpSecure,
        smtpFromName,
        welcomeSubject,
        welcomeBody,
        upgradeAlertEnabled,
        upgradeAlertEmail,
      };
      if (logoCleared) body.platformLogo = "";
      await axios.put(SETTINGS_URL, body, { headers: authHeaders() });
      if (logoCleared) setLogoCleared(false);
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setLogoCleared(false);
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      const { data } = await axios.post(LOGO_URL, form, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });
      setLogoPreview(`${API_BASE}/${data.logoPath}`);
      toast.success("Logo uploaded successfully");
    } catch (err) {
      toast.error("Logo upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#008ecc]" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            System Settings
          </h2>
          <p className="text-slate-500 text-sm">
            Configure platform branding, email delivery, and alert preferences.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* ── Branding ── */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center space-x-2">
                    <Globe size={18} className="text-[#008ecc]" />
                    <span>Branding</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Platform name, support contact, and logo shown in emails and templates.
                  </CardDescription>
                </div>
                <ResetButton onClick={resetBranding} />
              </div>
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
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Platform Logo
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={logoPreview || "/images/TZI_Logo-04_-_Copy-removebg-preview.png"}
                    alt="Platform logo"
                    className="h-14 w-auto object-contain border border-slate-200 rounded-lg p-1 bg-slate-50"
                    onError={(e) => { e.target.src = "/images/TZI_Logo-04_-_Copy-removebg-preview.png"; }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current.click()}
                    disabled={logoUploading}
                    className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    {logoUploading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    <span>{logoUploading ? "Uploading…" : "Upload Logo"}</span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Recommended: PNG or SVG, max 5 MB.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── SMTP ── */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center space-x-2">
                    <Mail size={18} className="text-[#008ecc]" />
                    <span>SMTP / Email Setup</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Configure the outgoing mail server. Leave blank to use the default Gmail credentials from the server environment.
                  </CardDescription>
                </div>
                <ResetButton onClick={resetSmtp} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    SMTP Username
                  </label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    SMTP Password / App Password
                  </label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="Leave unchanged if already set"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="TZI Support"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
                <div className="flex items-center space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setSmtpSecure(!smtpSecure)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                      smtpSecure ? "bg-[#008ecc]" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        smtpSecure ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-semibold text-slate-700">
                    Use SSL/TLS (port 465)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Welcome Email Template ── */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center space-x-2">
                    <FileText size={18} className="text-[#008ecc]" />
                    <span>Welcome Email Template</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Sent to new tenant admins when their workspace is created.{" "}
                    <code className="bg-slate-100 px-1 rounded text-xs">
                      {"{{adminName}} {{email}} {{password}} {{loginUrl}} {{platformName}}"}
                    </code>
                  </CardDescription>
                </div>
                <ResetButton onClick={resetWelcomeEmail} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={welcomeSubject}
                  onChange={(e) => setWelcomeSubject(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Body (HTML supported)
                </label>
                <textarea
                  value={welcomeBody}
                  onChange={(e) => setWelcomeBody(e.target.value)}
                  rows={10}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#008ecc] resize-y"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Upgrade Alert ── */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center space-x-2">
                    <Bell size={18} className="text-[#008ecc]" />
                    <span>Upgrade Request Alerts</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Get notified by email whenever a tenant submits a plan upgrade request.
                  </CardDescription>
                </div>
                <ResetButton onClick={resetUpgradeAlerts} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Enable Upgrade Alerts
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Send an email when a tenant requests a plan upgrade.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeAlertEnabled(!upgradeAlertEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                    upgradeAlertEnabled ? "bg-[#008ecc]" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      upgradeAlertEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {upgradeAlertEnabled && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Alert Recipient Email
                  </label>
                  <input
                    type="email"
                    value={upgradeAlertEmail}
                    onChange={(e) => setUpgradeAlertEmail(e.target.value)}
                    placeholder="Leave blank to use Support Email above"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Save ── */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              <span>{saving ? "Saving…" : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Toast Container */}
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default SuperAdminSettings;