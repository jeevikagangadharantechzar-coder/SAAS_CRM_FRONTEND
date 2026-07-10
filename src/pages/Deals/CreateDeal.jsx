import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import { getNames } from "country-list";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  ArrowLeft,
  DollarSign,
  Briefcase,
  UserCheck,
  StickyNote,
  Phone,
  Mail,
  Building2,
  Globe,
  MapPin,
  FileText,
  BriefcaseBusiness,
  Calendar,
  Clock,
} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

// Import Lost Deal components
import useLostDealModal from "../LostDealModal/LossDeal";
import LostDealModal from "../LostDealModal/ModalLoss";

// Email validation function
const validateEmail = (email) => {
  if (!email) return true; // Empty is allowed (not required)
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation function - stricter validation
const validatePhoneNumber = (phone) => {
  if (!phone) return true; // Empty is allowed (not required)
  
  // Remove all spaces, dashes, parentheses, dots, and plus sign for validation
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Must start with + or digit
  if (!/^[\+]?[0-9]/.test(cleaned)) return false;
  
  // Remove the leading + for length check
  const withoutPlus = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  
  // Check length: minimum 7 digits, maximum 15 digits (international standards)
  if (withoutPlus.length < 7 || withoutPlus.length > 15) return false;
  
  // Check if all remaining characters are digits
  if (!/^\d+$/.test(withoutPlus)) return false;
  
  // Additional check: reject numbers that are all the same digit (e.g., 0000000000)
  if (/^(\d)\1+$/.test(withoutPlus)) return false;
  
  // Reject numbers that start with 0 and are less than 10 digits (invalid format)
  if (withoutPlus.length < 10 && withoutPlus.startsWith('0')) return false;
  
  return true;
};

// True when the phone value is just a dial code with no subscriber digits typed yet
// (react-phone-input-2 fires onChange with only the dial code as soon as a country is picked)
const isEffectivelyEmptyPhone = (phone) => {
  if (!phone) return true;
  return phone.replace(/\D/g, '').length <= 3;
};

// Currency options with symbol and label
const currencyOptions = [
  { code: "USD", symbol: "$", label: "🇺🇸 USD" },
  { code: "EUR", symbol: "€", label: "🇪🇺 EUR" },
  { code: "INR", symbol: "₹", label: "🇮🇳 INR" },
  { code: "GBP", symbol: "£", label: "🇬🇧 GBP" },
  { code: "JPY", symbol: "¥", label: "🇯🇵 JPY" },
  { code: "AUD", symbol: "A$", label: "🇦🇺 AUD" },
  { code: "CAD", symbol: "C$", label: "🇨🇦 CAD" },
  { code: "CHF", symbol: "CHF", label: "🇨🇭 CHF" },
  { code: "MYR", symbol: "RM", label: "🇲🇾 MYR" },
  { code: "AED", symbol: "د.إ", label: "🇦🇪 AED" },
  { code: "SGD", symbol: "S$", label: "🇸🇬 SGD" },
  { code: "ZAR", symbol: "R", label: "🇿🇦 ZAR" },
  { code: "SAR", symbol: "﷼", label: "🇸🇦 SAR" },
];

// ─── Helper: normalise an attachment entry to { filePath, fileName } ───────────
const normaliseAttachment = (file) => {
  if (!file) return { filePath: "", fileName: "attachment" };

  // Plain string (file path)
  if (typeof file === "string") {
    return {
      filePath: file,
      fileName: file.split("/").pop() || "attachment",
    };
  }

  // Object returned by the backend (various possible shapes)
  const filePath =
    file.path || file.filePath || file.url || file.filename || file.name || "";
  const fileName =
    file.originalname ||
    file.fileName ||
    file.filename ||
    file.name ||
    (filePath ? filePath.split("/").pop() : "attachment");

  return { filePath, fileName };
};

// Preview Modal Component
const PreviewModal = ({ file, onClose }) => {
  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold">{file.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <img
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
        <div className="flex justify-end p-4 border-t">
          <a
            href={file.url}
            download={file.name}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={(e) => e.stopPropagation()}
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
};

export default function CreateDeal() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const location = useLocation();
  const isEditMode = location.state?.deal;
  const existingDeal = location.state?.deal || null;

  // Use Lost Deal Modal hook
  const {
    modalOpen: lostModalOpen,
    lossReason,
    lossNotes,
    validationError,
    LOSS_REASONS,
    isLoading: modalLoading,
    setLossReason,
    setLossNotes,
    openModal: openLostDealModal,
    closeModal: closeLostDealModal,
    validateAndExecute: validateLostDeal,
    resetModal,
  } = useLostDealModal();

  const [formData, setFormData] = useState({
    dealName: "",
    dealValue: "",
    currency: "INR",
    preferredCurrency: "",
    preferredCurrencyValue: "",
    stage: "Qualification",
    assignTo: "",
    notes: "",
    phoneNumber: "",
    email: "",
    alternativeNumber: "",
    alternativeEmail: "",
    source: "",
    companyName: "",
    industry: "",
    requirement: "",
    address: "",
    country: "",
    attachments: [],
    lossReason: "",
    lossNotes: "",
    followUpDate: null,
    followUpComment: "",
    followUpStatus: "",
    clientType: "",
  });

  const [errors, setErrors] = useState({});
  const [salesUsers, setSalesUsers] = useState([]);
  // existingAttachments stores normalised { filePath, fileName } objects
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [userCurrency, setUserCurrency] = useState("USD");
  const [convertedValue, setConvertedValue] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries] = useState(getNames());
  const [previewFile, setPreviewFile] = useState(null);
  const [pendingFormData, setPendingFormData] = useState(null);

/* ── Fetch User Data Function ─────────────────────── */
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role?.name || "");
      setUserId(user._id || "");
      setUserCurrency(user.currency || "USD");
    }
  }, []);

/* ── Live Currency Conversion ─────────────────────── */
  useEffect(() => {
    const dealValue = parseFloat(formData.dealValue);
    if (!formData.dealValue || isNaN(dealValue) || dealValue <= 0) {
      setConvertedValue(null);
      setFormData((prev) => ({ ...prev, preferredCurrencyValue: "", preferredCurrency: "" }));
      return;
    }

    if (formData.currency === userCurrency) {
      setConvertedValue(dealValue);
      setFormData((prev) => ({ ...prev, preferredCurrencyValue: dealValue, preferredCurrency: userCurrency }));
      return;
    }

    const timer = setTimeout(async () => {
      setIsConverting(true);
      try {
        const res = await axios.get(`https://open.er-api.com/v6/latest/${formData.currency}`);
        const rate = res.data?.rates?.[userCurrency];
        if (rate) {
          const converted = parseFloat((dealValue * rate).toFixed(2));
          setConvertedValue(converted);
          setFormData((prev) => ({ ...prev, preferredCurrencyValue: converted, preferredCurrency: userCurrency }));
        }
      } catch {
        setConvertedValue(null);
      } finally {
        setIsConverting(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.dealValue, formData.currency, userCurrency]);

/* ── Initialise Form Data Function ─────────────────────── */
  useEffect(() => {
    if (isEditMode && existingDeal) {
      let dealValue = "";
      let currency = "INR";
      if (existingDeal.value) {
        const valueParts = existingDeal.value.split(" ");
        if (valueParts.length >= 2) {
          dealValue = valueParts[0].replace(/,/g, "");
          currency = valueParts[1];
        } else {
          dealValue = existingDeal.value.replace(/,/g, "");
        }
      }

      let parsedFollowUpDate = null;
      if (existingDeal.followUpDate) {
        parsedFollowUpDate = new Date(existingDeal.followUpDate);
      }

      setFormData({
        dealName: existingDeal.dealName || "",
        dealValue: dealValue,
        currency: currency,
        stage: existingDeal.stage || "Qualification",
        assignTo: existingDeal.assignedTo?._id || "",
        notes: existingDeal.notes || "",
        phoneNumber: existingDeal.phoneNumber || "",
        email: existingDeal.email || "",
        alternativeNumber: existingDeal.alternativeNumber || "",
        alternativeEmail: existingDeal.alternativeEmail || "",
        source: existingDeal.source || "",
        companyName: existingDeal.companyName || "",
        industry: existingDeal.industry || "",
        requirement: existingDeal.requirement || "",
        address: existingDeal.address || "",
        country: existingDeal.country || "",
        clientType: existingDeal.clientType || "",
        attachments: [],
        lossReason: existingDeal.lossReason || "",
        lossNotes: existingDeal.lossNotes || "",
        followUpDate: parsedFollowUpDate,
        followUpComment: existingDeal.followUpComment || "",
        followUpStatus: existingDeal.followUpStatus || "",
      });

      // ── FIX: normalise every attachment regardless of backend shape ──
      if (existingDeal.attachments && existingDeal.attachments.length > 0) {
        const normalised = existingDeal.attachments.map(normaliseAttachment);
        setExistingAttachments(normalised);
      }
    }
  }, [isEditMode, existingDeal]);

/* ── Fetch Sales Users Function ─────────────────────── */
  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/users/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSalesUsers(response.data.users || []);
      } catch {
        // silently ignore
      }
    };
    fetchSalesUsers();
  }, [API_URL]);

/* ── Handle Change Function ─────────────────────── */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Clear error when user starts typing
    if (value.trim() !== "") {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
    
    // Real-time validation for email
    if (name === "email" && value && !validateEmail(value)) {
      setErrors((prev) => ({ ...prev, email: true }));
    } else if (name === "email") {
      setErrors((prev) => ({ ...prev, email: false }));
    }
    
    // Real-time validation for phone
    if (name === "phoneNumber" && value && !isEffectivelyEmptyPhone(value) && !validatePhoneNumber(value)) {
      setErrors((prev) => ({ ...prev, phoneNumber: true }));
    } else if (name === "phoneNumber") {
      setErrors((prev) => ({ ...prev, phoneNumber: false }));
    }

    // Real-time validation for alternative email
    if (name === "alternativeEmail" && value && !validateEmail(value)) {
      setErrors((prev) => ({ ...prev, alternativeEmail: true }));
    } else if (name === "alternativeEmail") {
      setErrors((prev) => ({ ...prev, alternativeEmail: false }));
    }

    // Real-time validation for alternative phone
    if (name === "alternativeNumber" && value && !isEffectivelyEmptyPhone(value) && !validatePhoneNumber(value)) {
      setErrors((prev) => ({ ...prev, alternativeNumber: true }));
    } else if (name === "alternativeNumber") {
      setErrors((prev) => ({ ...prev, alternativeNumber: false }));
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

/* ── Handle File Change Function ─────────────────────── */
  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("Some files exceed the 5MB size limit");
      e.target.value = null;
      setFormData((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          ...files.filter((file) => file.size <= 5 * 1024 * 1024),
        ],
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  }, []);

/* ── Handle Remove File Function ─────────────────────── */
  const handleRemoveFile = useCallback((idx, type = "new") => {
    if (type === "new") {
      setFormData((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== idx),
      }));
    } else {
      setExistingAttachments((prev) => prev.filter((_, i) => i !== idx));
    }
  }, []);

/* ── Close Preview Function ─────────────────────── */
  const closePreview = useCallback(() => {
    if (previewFile) {
      window.URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
  }, [previewFile]);

/* ── Handle File Download Function ─────────────────────── */
  const handleFileDownload = async (filePath) => {
    // ── FIX: guard against non-string or empty paths ──
    if (!filePath || typeof filePath !== "string") {
      toast.error("Invalid file path");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/files/download?filePath=${encodeURIComponent(filePath)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data]);
      const fileExtension = filePath.split(".").pop()?.toLowerCase();
      const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];

      if (imageExtensions.includes(fileExtension)) {
        const url = window.URL.createObjectURL(blob);
        setPreviewFile({
          url,
          name: filePath.split("/").pop() || "download",
          type: response.headers["content-type"],
        });
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filePath.split("/").pop() || "download";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

/* ── Handle Lost Deal Confirm Function ─────────────────────── */
  const handleLostDealConfirm = useCallback(
    async (lossData) => {
      if (lossData && lossData.reason && pendingFormData) {
        const updatedFormData = {
          ...pendingFormData,
          lossReason: lossData.reason,
          lossNotes: lossData.notes || "",
        };
        setFormData(updatedFormData);
        await submitDealData(updatedFormData);
        setPendingFormData(null);
      }
    },
    [pendingFormData]
  );

  const submitDealData = async (formDataToSubmit) => {
    setIsSubmitting(true);

    const newErrors = {
      dealName: formDataToSubmit.dealName.trim() === "",
      dealValue: formDataToSubmit.dealValue.trim() === "",
      phoneNumber: false,
      companyName: formDataToSubmit.companyName.trim() === "",
      email: false,
      alternativeNumber: false,
      alternativeEmail: false,
    };

    // Clear phone and email errors if they are valid
    if (
      formDataToSubmit.phoneNumber &&
      !isEffectivelyEmptyPhone(formDataToSubmit.phoneNumber) &&
      !validatePhoneNumber(formDataToSubmit.phoneNumber)
    ) {
      newErrors.phoneNumber = true;
    }
    if (formDataToSubmit.email && !validateEmail(formDataToSubmit.email)) {
      newErrors.email = true;
    }
    if (
      formDataToSubmit.alternativeNumber &&
      !isEffectivelyEmptyPhone(formDataToSubmit.alternativeNumber) &&
      !validatePhoneNumber(formDataToSubmit.alternativeNumber)
    ) {
      newErrors.alternativeNumber = true;
    }
    if (formDataToSubmit.alternativeEmail && !validateEmail(formDataToSubmit.alternativeEmail)) {
      newErrors.alternativeEmail = true;
    }

    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      toast.error("Please fill in all required fields and check format");
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const data = new FormData();

      Object.keys(formDataToSubmit).forEach((key) => {
        if (key !== "attachments") {
          if (key === "followUpDate" && formDataToSubmit[key] instanceof Date) {
            data.append(key, formDataToSubmit[key].toISOString());
          } else {
            data.append(key, formDataToSubmit[key] || "");
          }
        }
      });

      if (!isEditMode && userRole === "Sales" && !formDataToSubmit.assignTo) {
        data.set("assignTo", userId);
      }

      formDataToSubmit.attachments.forEach((file) => {
        data.append("attachments", file);
      });

      // ──  send only the raw file paths to the backend ──
      const rawPaths = existingAttachments.map((a) => a.filePath).filter(Boolean);
      data.append("existingAttachments", JSON.stringify(rawPaths));

      let response;
      if (isEditMode && existingDeal) {
        response = await axios.patch(
          `${API_URL}/deals/update-deal/${existingDeal._id}`,
          data,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success("Deal updated successfully");
      } else {
        response = await axios.post(`${API_URL}/deals/createManual`, data, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success("Deal created successfully");
      }
      setTimeout(() => navigate(`/${tenantSlug}/deals`), 2000);
    } catch (err) {
      console.error("Deal operation error:", err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error(isEditMode ? "Failed to update deal" : "Failed to create deal");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

/* ── Handle Submit Function ─────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Phone number validation
    if (
      formData.phoneNumber &&
      !isEffectivelyEmptyPhone(formData.phoneNumber) &&
      !validatePhoneNumber(formData.phoneNumber)
    ) {
      toast.error("Please enter a valid phone number (e.g., +91 1234567890, 1234567890, or +1 234567890)");
      setErrors((prev) => ({ ...prev, phoneNumber: true }));
      return;
    }

    // Email validation
    if (formData.email && !validateEmail(formData.email)) {
      toast.error("Please enter a valid email address (e.g., name@example.com)");
      setErrors((prev) => ({ ...prev, email: true }));
      return;
    }

    // Alternative phone number validation
    if (
      formData.alternativeNumber &&
      !isEffectivelyEmptyPhone(formData.alternativeNumber) &&
      !validatePhoneNumber(formData.alternativeNumber)
    ) {
      toast.error("Please enter a valid alternative phone number (e.g., +91 1234567890, 1234567890, or +1 234567890)");
      setErrors((prev) => ({ ...prev, alternativeNumber: true }));
      return;
    }

    // Alternative email validation
    if (formData.alternativeEmail && !validateEmail(formData.alternativeEmail)) {
      toast.error("Please enter a valid alternative email address (e.g., name@example.com)");
      setErrors((prev) => ({ ...prev, alternativeEmail: true }));
      return;
    }

    const newErrors = {
      dealName: formData.dealName.trim() === "",
      dealValue: formData.dealValue.trim() === "",
      phoneNumber: false,
      companyName: formData.companyName.trim() === "",
      email: false,
      alternativeNumber: false,
      alternativeEmail: false,
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.stage === "Closed Lost" && !formData.lossReason) {
      setPendingFormData(formData);
      const tempDealId =
        isEditMode && existingDeal ? existingDeal._id : "new-deal";
      openLostDealModal(tempDealId, handleLostDealConfirm);
      return;
    }

    await submitDealData(formData);
  };

  const handleBackClick = () => navigate(-1);

  const showAssignToField =
    userRole === "Admin" || (isEditMode && userRole === "Sales");

  const formFields = [
    {
      name: "stage",
      label: "Stage",
      icon: <Briefcase size={16} />,
      type: "select",
      options: [
        "Qualification",
        "Proposal Sent-Negotiation",
        "Invoice Sent",
        "Closed Won",
        "Closed Lost",
      ],
    },
    { 
      name: "phoneNumber", 
      label: "Phone Number", 
      icon: <Phone size={16} />,
      type: "tel",
      placeholder: "Add a valid phone number"
    },
        {
      name: "alternativeNumber",
      label: "Alternative Number",
      icon: <Phone size={16} />,
      type: "tel",
      placeholder: "Add an alternative phone number"
    },
    {
      name: "email",
      label: "Email",
      icon: <Mail size={16} />,
      type: "email",
      placeholder: "name@example.com"
    },

    {
      name: "alternativeEmail",
      label: "Alternative Email",
      icon: <Mail size={16} />,
      type: "email",
      placeholder: "alt@example.com"
    },
    { name: "companyName", label: "Company Name", icon: <Building2 size={16} /> },
    {
      name: "industry",
      label: "Industry",
      icon: <BriefcaseBusiness size={16} />,
      type: "select",
      options: ["IT", "Finance", "Healthcare", "Education", "Manufacturing", "Retail", "Other"],
    },
    {
      name: "clientType",
      label: "Client Type",
      icon: <Building2 size={16} />,
      type: "select",
      options: ["B2B", "B2C"],
    },
    {
      name: "source",
      label: "Source",
      icon: <Globe size={16} />,
      type: "select",
      options: ["Website", "Referral", "Social Media", "Email", "Phone", "Other"],
    },
    { name: "address", label: "Address", icon: <MapPin size={16} /> },
    {
      name: "country",
      label: "Country",
      icon: <Globe size={16} />,
      type: "select",
      options: countries,
    },
  ];

  return (
    <div className="min-h-screen flex items-start justify-center py-10 px-4">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <LostDealModal
        isOpen={lostModalOpen}
        onClose={() => {
          closeLostDealModal();
          setPendingFormData(null);
        }}
        lossReason={lossReason}
        lossNotes={lossNotes}
        validationError={validationError}
        LOSS_REASONS={LOSS_REASONS}
        onReasonChange={setLossReason}
        onNotesChange={setLossNotes}
        onConfirm={validateLostDeal}
        title={isEditMode ? "Update Loss Reason" : "Add Loss Reason"}
        confirmText={isEditMode ? "Update Deal" : "Create Deal"}
        dealName={formData.dealName}
        isLoading={modalLoading}
      />

      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-100">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-5 border-b rounded-t-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackClick}
              className="p-2 rounded-lg bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditMode ? "Edit Deal" : "Create New Deal"}
            </h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6 md:space-y-10">
          {/* Deal Info */}
          <div className="space-y-4 md:space-y-6 p-4 md:p-6 border border-gray-200 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold border-b pb-2 text-blue-600">
              Deal Information
            </h2>

            {formData.stage === "Closed Lost" && formData.lossReason && (
              <div className="md:col-span-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-semibold text-red-700 mb-1">Loss Information</h3>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Reason:</span> {formData.lossReason}
                </p>
                {formData.lossNotes && (
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-medium">Notes:</span> {formData.lossNotes}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Deal Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText size={16} /> Deal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="dealName"
                  value={formData.dealName}
                  onChange={handleChange}
                  placeholder="Enter Deal Name"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11"
                />
                {errors.dealName && (
                  <p className="text-red-500 text-sm mt-1">Deal Name is required</p>
                )}
              </div>

              {/* Deal Value & Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <DollarSign size={16} /> Deal Value <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 w-full">
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, currency: e.target.value }))
                    }
                    className="w-1/3 md:w-24 border rounded-lg px-2 text-sm h-11 focus:ring-2 focus:ring-green-500 focus:outline-none flex-shrink-0"
                  >
                    {currencyOptions.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    name="dealValue"
                    value={formData.dealValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9\b]+$/.test(val)) {
                        setFormData((prev) => ({ ...prev, dealValue: val }));
                        if (val.trim() !== "") {
                          setErrors((prev) => ({ ...prev, dealValue: false }));
                        }
                      }
                    }}
                    placeholder="Enter deal value"
                    className="w-2/3 flex-1 border rounded-lg px-3 py-2 text-sm h-11 focus:ring-2 focus:ring-green-500 focus:outline-none min-w-0"
                  />
                </div>
                {errors.dealValue && (
                  <p className="text-red-500 text-sm mt-1">Deal Value is required</p>
                )}
                <div className="min-h-[20px] mt-1">
                  {formData.dealValue && userCurrency && (
                    <p className="flex flex-wrap items-center gap-x-1 text-sm text-gray-500">
                      Your currency ({userCurrency}):
                      {isConverting ? (
                        <span className="text-gray-400 animate-pulse">Converting...</span>
                      ) : convertedValue !== null ? (
                        <span className="font-semibold text-green-600">
                          {currencyOptions.find((c) => c.code === userCurrency)?.symbol} {convertedValue.toLocaleString()}
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>
              </div>

              {/* Dynamic fields */}
              {formFields.map((field) => (
                <div key={field.name} className={field.type === "textarea" ? "md:col-span-3" : ""}>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    {field.icon} {field.label}
                    {(field.name === "phoneNumber" || field.name === "companyName") && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  {field.type === "select" ? (
                    field.name === "country" ? (
                      <Select
                        options={field.options.map((opt) =>
                          typeof opt === "string" ? { value: opt, label: opt } : { value: opt.value || opt, label: opt.label || opt }
                        )}
                        value={formData[field.name] ? { value: formData[field.name], label: formData[field.name] } : null}
                        onChange={(selected) => handleChange({ target: { name: field.name, value: selected ? selected.value : "" } })}
                        placeholder={`Select ${field.label}`}
                        isClearable
                        menuPortalTarget={document.body}
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            minHeight: '44px',
                            borderRadius: '0.5rem',
                            borderColor: state.isFocused ? '#60a5fa' : '#e5e7eb',
                            boxShadow: state.isFocused ? '0 0 0 2px #bfdbfe' : 'none',
                            fontSize: '0.875rem',
                            '&:hover': { borderColor: state.isFocused ? '#60a5fa' : '#d1d5db' }
                          }),
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          menu: (base) => ({ ...base, fontSize: '0.875rem' }),
                          option: (base, state) => ({
                            ...base,
                            whiteSpace: 'normal',
                            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
                            color: state.isSelected ? 'white' : '#1f2937'
                          })
                        }}
                      />
                    ) : (
                      <select
                        name={field.name}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11 truncate"
                      >
                        <option value="">Select {field.label}</option>
                        {field.options.map((opt) =>
                          typeof opt === "string" ? (
                            <option key={opt} value={opt}>{opt}</option>
                          ) : (
                            <option key={opt.value || opt} value={opt.value || opt}>
                              {opt.label || opt}
                            </option>
                          )
                        )}
                      </select>
                    )
                  ) : field.name === "phoneNumber" || field.name === "alternativeNumber" ? (
                    <>
                      <div
                        className={`border rounded-lg ${
                          errors[field.name] ? "border-red-500" : "border-gray-300"
                        }`}
                      >
                        <PhoneInput
                          country={"in"}
                          preferredCountries={["in"]}
                          countryCodeEditable={false}
                          value={formData[field.name]}
                          onChange={(phone) =>
                            handleChange({ target: { name: field.name, value: phone } })
                          }
                          placeholder="Select code and enter number"
                          specialLabel=""
                          inputStyle={{
                            width: "100%",
                            height: "42px",
                            fontSize: "14px",
                            paddingLeft: "55px",
                            borderRadius: "0.5rem",
                            border: "none",
                          }}
                          buttonStyle={{
                            borderRadius: "0.5rem 0 0 0.5rem",
                            height: "42px",
                            background: "white",
                            border: "none",
                            borderRight: "1px solid #e5e7eb",
                          }}
                        />
                      </div>
                      {errors[field.name] && (
                        <p className="text-red-500 text-xs mt-1">Invalid phone number format</p>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type={field.type || "text"}
                        name={field.name}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                        placeholder={field.placeholder || `Enter ${field.label}`}
                        className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11 ${
                          errors[field.name] ? "border-red-500" : ""
                        }`}
                      />
                      {errors[field.name] && (field.name === "email" || field.name === "alternativeEmail") && (
                        <p className="text-red-500 text-xs mt-1">Invalid email format</p>
                      )}
                    </>
                  )}
                  {errors[field.name] &&
                    !["phoneNumber", "email", "alternativeNumber", "alternativeEmail"].includes(field.name) && (
                      <p className="text-red-500 text-sm mt-1">{field.label} is required</p>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up Section */}
          <div className="p-4 md:p-6 border border-gray-200 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold border-b pb-2 text-purple-600 flex items-center gap-2">
              <Clock size={18} /> Follow-up
            </h2>
            {isEditMode ? (
              <div className="mt-6 flex flex-col items-center justify-center p-6 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-sm text-purple-800 mb-4 text-center max-w-md">
                  Follow-ups for this deal are now managed entirely through the Deal Details view.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/${tenantSlug}/Pipelineview/${existingDeal._id}`)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm text-sm font-medium transition flex items-center gap-2"
                >
                  <Clock size={16} /> Manage Follow-ups & History
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} /> Follow-up Date & Time
                  </label>
                  <div className="relative">
                    <DatePicker
                      selected={formData.followUpDate}
                      onChange={(date) =>
                        setFormData((prev) => ({ ...prev, followUpDate: date }))
                      }
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="MMMM d, yyyy h:mm aa"
                      placeholderText="Select date and time"
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition h-11 pl-10"
                      minDate={new Date()}
                      isClearable
                      calendarClassName="font-sans"
                    />
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Set a reminder for follow-up
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <StickyNote size={16} /> Follow-up Comment
                  </label>
                  <textarea
                    name="followUpComment"
                    rows={3}
                    value={formData.followUpComment}
                    onChange={handleChange}
                    placeholder="Enter follow-up notes..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white shadow-sm text-sm text-gray-700 placeholder-gray-400 transition resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Management */}
          {showAssignToField && (
            <div className="p-4 md:p-6 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold border-b pb-2 text-yellow-600">
                Management
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <UserCheck size={16} /> Assign To
                  </label>
                  <select
                    name="assignTo"
                    value={formData.assignTo}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11"
                  >
                    <option value="">Select User</option>
                    {salesUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                  {userRole === "Sales" && isEditMode && (
                    <p className="text-xs text-gray-500 mt-1">
                      You can reassign this deal to another sales user
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <StickyNote size={16} /> Notes
            </label>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter Notes..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white shadow-sm text-sm text-gray-700 placeholder-gray-400 transition resize-none"
            />
          </div>

          {/* Attachments */}
          <div className="p-6 border rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Attachments
            </h2>

            {/* ── FIX: render using normalised { filePath, fileName } objects ── */}
            {existingAttachments.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {existingAttachments.map((attachment, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center w-full bg-white border rounded-xl shadow-sm p-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleFileDownload(attachment.filePath)}
                      className="text-xs text-indigo-600 hover:underline truncate w-full text-center"
                    >
                      {attachment.fileName}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx, "existing")}
                      className="text-[12px] text-red-600 hover:underline mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload new files */}
            <div className="mt-4">
              <label
                htmlFor="attachments"
                className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition p-6"
              >
                {formData.attachments.length === 0 ? (
                  <>
                    <svg
                      className="w-8 h-8 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 16V8m0 0l-4 4m4-4l4 4M17 8v8m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">
                      Click or drag new files here (Max 5MB per file)
                    </span>
                  </>
                ) : (
                  <div className="w-full flex flex-wrap gap-4">
                    {formData.attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center justify-center w-28 h-28 bg-white border rounded-xl shadow-sm p-2"
                      >
                        <div className="w-12 h-12 flex items-center justify-center bg-indigo-100 rounded-md mb-1">
                          <span className="text-xs font-semibold text-indigo-600">
                            {file.name.split(".").pop().toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        <p className="text-[10px] text-gray-700 truncate w-full text-center">
                          {file.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx, "new")}
                          className="text-[12px] text-red-600 hover:underline mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={handleBackClick}
              className="px-6 py-2 rounded-lg border bg-white hover:bg-gray-100 text-gray-700 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md transition disabled:bg-blue-400 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Deal"
                : "Save Deal"}
            </button>
          </div>
        </form>
      </div>

      {previewFile && <PreviewModal file={previewFile} onClose={closePreview} />}
    </div>
  );
}