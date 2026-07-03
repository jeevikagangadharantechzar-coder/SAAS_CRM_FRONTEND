import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UploadCloud, Save, Image, Globe, Bookmark, Send, MapPin, CreditCard, FileText } from "react-feather";

export default function Settings() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [logo, setLogo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [favicon, setFavicon] = useState(null);
  const [selectedFavicon, setSelectedFavicon] = useState(null);

  // New Invoice Settings states
  const [invoiceLogo, setInvoiceLogo] = useState(null);
  const [selectedInvoiceLogo, setSelectedInvoiceLogo] = useState(null);
  const [tenantName, setTenantName] = useState("");

  // Business details shown on invoices
  const [businessDetails, setBusinessDetails] = useState({
    address: "", phone: "", email: "", taxIdLabel: "Tax ID", taxId: "",
  });

  // Bank details shown on invoices
  const [bankDetails, setBankDetails] = useState({
    accountName: "", accountNumber: "", bankName: "", ifscOrSwift: "", branch: "",
  });

  // Invoice terms & conditions footer text
  const [termsAndConditions, setTermsAndConditions] = useState("");

  // Gmail account connected (via OAuth) for sending invoices
  const [invoiceGmailEmail, setInvoiceGmailEmail] = useState(null);
  const [connectingGmail, setConnectingGmail] = useState(false);

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  /* ── Fetch Settings Function ─────────────────────── */
  const fetchSettings = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/settings`);
      console.log("Settings response:", data);

      if (data?.companyName) {
        setCompanyName(data.companyName);
      }

      const baseUrl = API_URL.replace("/api", "");

      if (data?.logo) {
        const imageUrl = `${baseUrl}/${data.logo.replace(/\\/g, "/")}`;
        console.log("Final Logo URL:", imageUrl);
        setLogo(imageUrl);
      } else {
        setLogo(null);
      }
      if (data?.favicon) {
        const faviconUrl = `${baseUrl}/${data.favicon.replace(/\\/g, "/")}`;
        setFavicon(faviconUrl);
      } else {
        setFavicon(null);
      }
      if (data?.invoiceLogo) {
        const invoiceLogoUrl = `${baseUrl}/${data.invoiceLogo.replace(/\\/g, "/")}`;
        setInvoiceLogo(invoiceLogoUrl);
      } else {
        setInvoiceLogo(null);
      }

      setTenantName(data?.tenantName || "");

      setBusinessDetails({
        address: data?.address || "",
        phone: data?.phone || "",
        email: data?.email || "",
        taxIdLabel: data?.taxIdLabel || "Tax ID",
        taxId: data?.taxId || "",
      });
      setBankDetails({
        accountName: data?.bankDetails?.accountName || "",
        accountNumber: data?.bankDetails?.accountNumber || "",
        bankName: data?.bankDetails?.bankName || "",
        ifscOrSwift: data?.bankDetails?.ifscOrSwift || "",
        branch: data?.bankDetails?.branch || "",
      });
      setTermsAndConditions(data?.termsAndConditions || "");
      setInvoiceGmailEmail(data?.invoiceSenderEmail || null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load settings");
    }
  };

  // ─── URL params (OAuth callback from Connect Gmail) ───────────────────────
  useEffect(() => {
    const connected = searchParams.get("gmail_invoice_connected");
    const gmailError = searchParams.get("gmail_error");
    const returnedEmail = searchParams.get("email");

    if (connected === "1") {
      toast.success(`Gmail connected: ${returnedEmail || ""}`);
      if (returnedEmail) setInvoiceGmailEmail(returnedEmail);
      navigate(location.pathname, { replace: true });
      setConnectingGmail(false);
    }
    if (gmailError) {
      toast.error(searchParams.get("error") || "Error connecting Gmail.");
      navigate(location.pathname, { replace: true });
      setConnectingGmail(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* ── Handle Connect Invoice Gmail Function ─────────────────────── */
  const handleConnectInvoiceGmail = async () => {
    try {
      setConnectingGmail(true);
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${API_URL}/settings/invoice-email/connect-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to start Gmail connection");
      setConnectingGmail(false);
    }
  };

  /* ── Handle Disconnect Invoice Gmail Function ─────────────────────── */
  const handleDisconnectInvoiceGmail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/settings/invoice-email`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Gmail disconnected");
      setInvoiceGmailEmail(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

/* ── Handle File Change Function ─────────────────────── */
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

/* ── Handle Logo Upload Function ─────────────────────── */
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a logo image");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("logo", selectedFile);

      await axios.post(`${API_URL}/settings/logo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Logo updated successfully!");
      setSelectedFile(null);
      fetchSettings();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

/* ── Handle Company Name Update Function ─────────────────────── */
  const handleCompanyNameUpdate = async () => {
    if (!companyName.trim()) {
      toast.error("Company name cannot be empty");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/settings/company-name`,
        { companyName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Company name updated successfully!");
      document.title = companyName;
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

/* ── Handle Favicon Change Function ─────────────────────── */
  const handleFaviconChange = (e) => {
    setSelectedFavicon(e.target.files[0]);
  };

  /* ── Handle Favicon Upload Function ─────────────────────── */
  const handleFaviconUpload = async () => {
    if (!selectedFavicon) {
      toast.error("Please select a favicon image");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("favicon", selectedFavicon);

      await axios.post(`${API_URL}/settings/favicon`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Favicon updated successfully!");
      setSelectedFavicon(null);
      fetchSettings();

      const faviconElement = document.getElementById("dynamic-favicon");
      if (faviconElement && favicon) {
        faviconElement.href = favicon;
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── Handle Invoice Logo Change Function ─────────────────────── */
  const handleInvoiceLogoChange = (e) => {
    setSelectedInvoiceLogo(e.target.files[0]);
  };

  /* ── Handle Invoice Logo Upload Function ─────────────────────── */
  const handleInvoiceLogoUpload = async () => {
    if (!selectedInvoiceLogo) {
      toast.error("Please select an invoice logo image");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("logo", selectedInvoiceLogo);

      await axios.post(`${API_URL}/settings/invoice-logo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Invoice logo updated successfully!");
      setSelectedInvoiceLogo(null);
      fetchSettings();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Invoice logo upload failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── Handle Business Details Update Function ─────────────────────── */
  const handleBusinessDetailsUpdate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/settings/business-details`, businessDetails, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Business details updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── Handle Bank Details Update Function ─────────────────────── */
  const handleBankDetailsUpdate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/settings/bank-details`, bankDetails, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Bank details updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── Handle Terms & Conditions Update Function ─────────────────────── */
  const handleTermsUpdate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/settings/terms`, { termsAndConditions }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Terms & conditions updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        
        {/* PAGE HEADER */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                Company Settings
              </h1>
              <p className="text-sm sm:text-base text-gray-500 mt-1">
                Customize your branding and browser display configuration.
              </p>
            </div>
          </div>
          <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
        </div>

        {/* RESPONSIVE GRID - Changes based on screen size */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          
          {/* ================= LOGO CARD ================= */}
          <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200">
            
            <div className="space-y-4 sm:space-y-5 flex-1">
              {/* Header with icon */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <Image className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                      Company Logo
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Used across dashboards and reports
                  </p>
                </div>
                {logo && (
                  <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-200">
                    Active
                  </span>
                )}
              </div>

              {/* Logo Preview */}
              <div className="flex justify-center">
                {logo ? (
                  <div className="relative group">
                    <img
                      src={logo}
                      alt="Company Logo"
                      className="h-20 sm:h-24 w-auto max-w-[200px] object-contain border-2 border-gray-100 rounded-xl p-3 bg-gray-50 group-hover:border-blue-200 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl transition-all"></div>
                  </div>
                ) : (
                  <div className="h-20 sm:h-24 w-full max-w-[200px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 text-sm">
                    <span className="text-xs sm:text-sm">No logo uploaded</span>
                  </div>
                )}
              </div>

              {/* File Input */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">
                  Upload new logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs sm:text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-lg p-1"
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleUpload}
              disabled={loading}
              className="mt-4 sm:mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <UploadCloud size={16} className="sm:w-4 sm:h-4" />
              {loading ? "Uploading..." : "Update Logo"}
            </button>
          </div>

          {/* ================= FAVICON CARD ================= */}
          <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200">
            
            <div className="space-y-4 sm:space-y-5 flex-1">
              {/* Header with icon */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-purple-50 rounded-lg">
                      <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                      Browser Favicon
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Displayed in browser tabs
                  </p>
                </div>
                {favicon && (
                  <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-200">
                    Active
                  </span>
                )}
              </div>

              {/* Favicon Preview */}
              <div className="flex justify-center">
                {favicon ? (
                  <div className="relative group">
                    <img
                      src={favicon}
                      alt="Favicon"
                      className="h-14 w-14 sm:h-16 sm:w-16 object-contain border-2 border-gray-100 rounded-xl p-2 bg-gray-50 group-hover:border-purple-200 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl transition-all"></div>
                  </div>
                ) : (
                  <div className="h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400">
                    <span className="text-xs">None</span>
                  </div>
                )}
              </div>

              {/* File Input */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">
                  Upload new favicon
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFaviconChange}
                  className="w-full text-xs sm:text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 border border-gray-200 rounded-lg p-1"
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleFaviconUpload}
              disabled={loading}
              className="mt-4 sm:mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <UploadCloud size={16} className="sm:w-4 sm:h-4" />
              {loading ? "Uploading..." : "Update Favicon"}
            </button>
          </div>

          {/* ================= COMPANY NAME CARD ================= */}
          <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 md:col-span-2 lg:col-span-1">
            
            <div className="space-y-4 sm:space-y-5 flex-1">
              {/* Header with icon */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-green-50 rounded-lg">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                      Company Name
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Appears in browser tab title
                  </p>
                </div>
                {companyName && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-200">
                    Active
                  </span>
                )}
              </div>

              {/* Input Field */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">
                  Enter company name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 sm:p-3 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="e.g., Acme Corporation"
                />
                {companyName && (
                  <p className="text-xs text-gray-500">
                    Browser title will be: <span className="font-medium text-gray-700">{companyName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleCompanyNameUpdate}
              className="mt-4 sm:mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-green-700 hover:to-green-800 transition shadow-md hover:shadow-lg"
            >
              <Save size={16} className="sm:w-4 sm:h-4" />
              Update Company Name
            </button>
          </div>

          {/* ================= INVOICE LOGO CARD ================= */}
          <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200">
            
            <div className="space-y-4 sm:space-y-5 flex-1">
              {/* Header with icon */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-indigo-50 rounded-lg">
                      <Image className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                      Message Template Logo
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Used on PDF invoices, proposals, and email campaigns
                  </p>
                </div>
                {invoiceLogo && (
                  <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-200">
                    Active
                  </span>
                )}
              </div>

              {/* Invoice Logo Preview */}
              <div className="flex justify-center">
                {invoiceLogo ? (
                  <div className="relative group">
                    <img
                      src={invoiceLogo}
                      alt="Invoice Logo"
                      className="h-20 sm:h-24 w-auto max-w-[200px] object-contain border-2 border-gray-100 rounded-xl p-3 bg-gray-50 group-hover:border-indigo-200 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl transition-all"></div>
                  </div>
                ) : (
                  <div className="h-20 sm:h-24 w-full max-w-[200px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 text-sm">
                    <span className="text-xs sm:text-sm">Using main logo fallback</span>
                  </div>
                )}
              </div>

              {/* File Input */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">
                  Upload invoice logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleInvoiceLogoChange}
                  className="w-full text-xs sm:text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-200 rounded-lg p-1"
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleInvoiceLogoUpload}
              disabled={loading}
              className="mt-4 sm:mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-indigo-700 hover:to-indigo-800 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <UploadCloud size={16} className="sm:w-4 sm:h-4" />
              {loading ? "Uploading..." : "Update Invoice Logo"}
            </button>
          </div>

          {/* ================= BUSINESS DETAILS CARD ================= */}
          <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200">
            <div className="space-y-4 sm:space-y-5 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-orange-50 rounded-lg">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-800">Business Details</h2>
                  <p className="text-xs sm:text-sm text-gray-500">Shown on every invoice PDF</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Business Address</label>
                <textarea
                  rows="2"
                  value={businessDetails.address}
                  onChange={(e) => setBusinessDetails((p) => ({ ...p, address: e.target.value }))}
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Street, City, State, ZIP, Country"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={businessDetails.phone}
                    onChange={(e) => setBusinessDetails((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={businessDetails.email}
                    onChange={(e) => setBusinessDetails((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Tax ID Label</label>
                  <input
                    type="text"
                    value={businessDetails.taxIdLabel}
                    onChange={(e) => setBusinessDetails((p) => ({ ...p, taxIdLabel: e.target.value }))}
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="e.g. GSTIN, VAT No., EIN"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Tax ID</label>
                  <input
                    type="text"
                    value={businessDetails.taxId}
                    onChange={(e) => setBusinessDetails((p) => ({ ...p, taxId: e.target.value }))}
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleBusinessDetailsUpdate}
              disabled={loading}
              className="mt-4 sm:mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-orange-700 hover:to-orange-800 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <Save size={16} className="sm:w-4 sm:h-4" />
              Save Business Details
            </button>
          </div>

          {/* ================= BANK DETAILS CARD ================= */}
          <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200">
            <div className="space-y-4 sm:space-y-5 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-teal-50 rounded-lg">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-800">Bank Details</h2>
                  <p className="text-xs sm:text-sm text-gray-500">Payment info shown on invoices</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Account Name</label>
                <input
                  type="text"
                  value={bankDetails.accountName}
                  onChange={(e) => setBankDetails((p) => ({ ...p, accountName: e.target.value }))}
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Account Number</label>
                  <input
                    type="text"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails((p) => ({ ...p, accountNumber: e.target.value }))}
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Bank Name</label>
                  <input
                    type="text"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails((p) => ({ ...p, bankName: e.target.value }))}
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">IFSC / SWIFT</label>
                  <input
                    type="text"
                    value={bankDetails.ifscOrSwift}
                    onChange={(e) => setBankDetails((p) => ({ ...p, ifscOrSwift: e.target.value }))}
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Branch</label>
                  <input
                    type="text"
                    value={bankDetails.branch}
                    onChange={(e) => setBankDetails((p) => ({ ...p, branch: e.target.value }))}
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleBankDetailsUpdate}
              disabled={loading}
              className="mt-4 sm:mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-teal-700 hover:to-teal-800 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <Save size={16} className="sm:w-4 sm:h-4" />
              Save Bank Details
            </button>
          </div>

          {/* ================= TERMS & CONDITIONS CARD ================= */}
          <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200">
            <div className="space-y-4 sm:space-y-5 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-pink-50 rounded-lg">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-800">Terms & Conditions</h2>
                  <p className="text-xs sm:text-sm text-gray-500">Footer text on every invoice</p>
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  rows="4"
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="e.g. Payment due within 30 days."
                />
              </div>
            </div>

            <button
              onClick={handleTermsUpdate}
              disabled={loading}
              className="mt-4 sm:mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-pink-700 hover:to-pink-800 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <Save size={16} className="sm:w-4 sm:h-4" />
              Save Terms
            </button>
          </div>

          {/* ================= INVOICE SENDING EMAIL CARD ================= */}
          <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200">
            <div className="space-y-4 sm:space-y-5 flex-1">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-cyan-50 rounded-lg">
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800">Invoice Sending Email</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Send invoices from your own Gmail</p>
                  </div>
                </div>
                {invoiceGmailEmail && (
                  <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-200">
                    Connected
                  </span>
                )}
              </div>

              {invoiceGmailEmail ? (
                <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  Sending as <span className="font-medium">{invoiceGmailEmail}</span>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-500">
                  Not connected — invoices currently send via the platform's shared mailbox. Connect your own Gmail so invoices come from your business.
                </p>
              )}
            </div>

            <div className="mt-4 sm:mt-6">
              {invoiceGmailEmail ? (
                <button
                  onClick={handleDisconnectInvoiceGmail}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectInvoiceGmail}
                  disabled={connectingGmail}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-cyan-700 hover:to-cyan-800 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <Send size={16} className="sm:w-4 sm:h-4" />
                  {connectingGmail ? "Redirecting..." : "Connect Gmail"}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Bottom spacing */}
        <div className="h-8 sm:h-12"></div>
      </div>
    </div>
  );
}