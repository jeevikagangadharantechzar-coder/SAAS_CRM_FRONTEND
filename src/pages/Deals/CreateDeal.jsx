import React, { useState, useEffect, useCallback, useRef } from "react";
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
  LocateFixed,
  Plus,
  X,
} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

import useLostDealModal from "../LostDealModal/LossDeal";
import ReassignmentModal from "../components/ReassignmentModal";

const STANDARD_INDUSTRIES = [
  "IT",
  "Finance",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail",
  "Real Estate",
  "Energy & Utilities",
  "Construction",
  "Telecommunications",
  "Automotive",
  "Fashion & Apparel",
  "Food & Beverage",
  "Media & Advertising",
  "Non-profit",
  "Professional Services"
];

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
          <h3 className="">{file.name}</h3>
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
    dealIdForLostModal,
    closeModal: closeLostDealModal,
    validateAndExecute: validateLostDeal,
    handleLostDealSubmit,
    resetModal,
    renderModal: renderLostDealModal,
  } = useLostDealModal();

  const [isCustomIndustry, setIsCustomIndustry] = useState(false);

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
    city: "",
    state: "",
    pincode: "",
    country: "",
    latitude: "",
    longitude: "",
    attachments: [],
    images: [],
    lossReason: "",
    lossNotes: "",
    followUpDate: null,
    followUpComment: "",
    followUpStatus: "",
    clientType: "",
  });

  const [errors, setErrors] = useState({});
  // Live "already exists" hints — { exists: true, dealName } | { exists: false } | undefined
  const [duplicateHints, setDuplicateHints] = useState({});
  const [salesUsers, setSalesUsers] = useState([]);
  // existingAttachments stores normalised { filePath, fileName } objects
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [userCurrency, setUserCurrency] = useState("USD");
  const [convertedValue, setConvertedValue] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries] = useState(getNames());
  const [previewFile, setPreviewFile] = useState(null);
  const [reassignmentModalOpen, setReassignmentModalOpen] = useState(false);
  const [reassignmentCheckData, setReassignmentCheckData] = useState(null);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Dynamic (per-card) custom fields
  const [customFields, setCustomFields] = useState([]); // committed: [{id, cardTitle, name, type, options, value}]
  const [draftRows, setDraftRows] = useState({}); // { [cardTitle]: [{id, name, type, options}] }
  const [draftOpen, setDraftOpen] = useState({}); // { [cardTitle]: bool }
  const customFieldIdRef = useRef(0);
  const nextCustomFieldId = () => `cf-${Date.now()}-${customFieldIdRef.current++}`;

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

      const isCustom = existingDeal.industry && !STANDARD_INDUSTRIES.includes(existingDeal.industry);
      setIsCustomIndustry(!!isCustom);

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
        city: existingDeal.city || "",
        state: existingDeal.state || "",
        pincode: existingDeal.pincode || "",
        country: existingDeal.country || "",
        latitude: existingDeal.latitude || "",
        longitude: existingDeal.longitude || "",
        clientType: existingDeal.clientType || "",
        attachments: [],
        images: [],
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
      if (existingDeal.images && existingDeal.images.length > 0) {
        const normalisedImages = existingDeal.images.map(normaliseAttachment);
        setExistingImages(normalisedImages);
      }

      setCustomFields(
        (existingDeal.customFields || []).map((f) => ({
          id: nextCustomFieldId(),
          cardTitle: f.cardTitle || "",
          name: f.name || "",
          type: f.type || "text",
          options: f.options || [],
          value: f.value || "",
        }))
      );
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

  // Live "this email/phone is already used by another deal" hint — same
  // debounced (500ms) check as CreateLeads.jsx. In edit mode the deal's own
  // current email/phone must be excluded, or it would always flag itself.
  useEffect(() => {
    const email = formData.email?.trim();
    const phoneNumber = formData.phoneNumber?.trim();

    // Clear any stale hint the moment its field is emptied.
    setDuplicateHints((prev) => {
      const next = { ...prev };
      if (!email) delete next.email;
      if (!phoneNumber) delete next.phoneNumber;
      return next;
    });
    if (!email && !phoneNumber) return;

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const params = {};
        if (email) params.email = email;
        if (phoneNumber) params.phoneNumber = phoneNumber;
        if (isEditMode && existingDeal?._id) params.excludeId = existingDeal._id;
        const res = await axios.get(`${API_URL}/deals/check-duplicate`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setDuplicateHints((prev) => ({ ...prev, ...res.data }));
      } catch {
        // Non-critical UI hint — a failed check just means no hint shows.
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email, formData.phoneNumber, isEditMode, existingDeal, API_URL]);

/* ── Use Current Location (Geolocation + Reverse Geocoding) ─────────────────────── */
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await axios.get(
            "https://nominatim.openstreetmap.org/reverse",
            {
              params: {
                lat: latitude,
                lon: longitude,
                format: "json",
              },
            }
          );

          const addr = response.data.address || {};
          const matchedCountry =
            countries.find(
              (c) => c.toLowerCase() === (addr.country || "").toLowerCase()
            ) || addr.country || "";

          setFormData((prev) => ({
            ...prev,
            address: response.data.display_name || prev.address,
            city: addr.city || addr.town || addr.village || addr.county || "",
            state: addr.state || "",
            pincode: addr.postcode || "",
            country: matchedCountry,
            latitude,
            longitude,
          }));
          toast.success("Location fetched successfully");
        } catch (error) {
          console.error("Error fetching address:", error);
          toast.error("Failed to fetch address details. Please enter manually.");
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Please enter manually."
            : "Unable to fetch your location. Please enter manually."
        );
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const totalFiles = formData.images.length + files.length + existingImages.length;
    if (totalFiles > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    const invalidFiles = files.filter((file) => !file.type.startsWith("image/"));
    if (invalidFiles.length > 0) {
      toast.error("Only image files are allowed");
      return;
    }
    const oversizedFiles = files.filter((file) => file.size > 20 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("Some images exceed the 20MB size limit");
      return;
    }
    setFormData((prev) => ({ ...prev, images: [...prev.images, ...files] }));
  };

  const handleRemoveImage = (idx, type = "new") => {
    if (type === "new") {
      setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
    } else {
      setExistingImages((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  // /uploads is served as public static files (see backend app.js), so an
  // already-uploaded image can be shown directly — no authenticated fetch needed.
  const buildImageUrl = (path) =>
    `${API_URL.replace("/api", "")}/${String(path || "").replace(/^\/+/, "")}`;

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

  // Removed handleLostDealConfirm as it suffered from stale closure issues.
  // The logic is now inlined in handleSubmit to perfectly capture the current formData.

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
        if (key !== "attachments" && key !== "images") {
          if (key === "followUpDate" && formDataToSubmit[key] instanceof Date) {
            data.append(key, formDataToSubmit[key].toISOString());
          } else if ((key === "phoneNumber" || key === "alternativeNumber") && formDataToSubmit[key]) {
            const rawPhone = String(formDataToSubmit[key]).trim();
            const formattedPhone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;
            data.append(key, formattedPhone);
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
      formDataToSubmit.images.forEach((file) => {
        data.append("images", file);
      });

      // ──  send only the raw file paths to the backend ──
      const rawPaths = existingAttachments.map((a) => a.filePath).filter(Boolean);
      data.append("existingAttachments", JSON.stringify(rawPaths));

      const rawImagePaths = existingImages.map((a) => a.filePath).filter(Boolean);
      data.append("existingImages", JSON.stringify(rawImagePaths));

      data.append(
        "customFields",
        JSON.stringify(
          customFields.map((f) => ({
            cardTitle: f.cardTitle,
            name: f.name,
            type: f.type,
            options: f.options,
            value: f.value,
          }))
        )
      );

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

      if (formDataToSubmit.stage === "Closed Lost" && formDataToSubmit.lossReason) {
        const savedDealId =
          isEditMode && existingDeal
            ? existingDeal._id
            : response.data?.data?._id || response.data?.deal?._id || response.data?._id;
        if (savedDealId) {
          try {
            await axios.post(
              `${API_URL}/deals/lost-reason`,
              {
                dealId: savedDealId,
                reason: formDataToSubmit.lossReason,
                notes: formDataToSubmit.lossNotes || "",
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (lostReasonErr) {
            console.error("Error creating LostDealReason record:", lostReasonErr);
          }
        }
      }

      setTimeout(() => navigate(`/${tenantSlug}/Pipelineview`), 2000);
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
      const tempDealId =
        isEditMode && existingDeal ? existingDeal._id : "new-deal";
      openLostDealModal(
        {
          _id: tempDealId,
          dealName: formData.dealName,
          lossReason: formData.lossReason,
          lossNotes: formData.lossNotes,
        },
        async (lossData) => {
          if (lossData && lossData.reason) {
            const updatedFormData = {
              ...formData,
              lossReason: lossData.reason,
              lossNotes: lossData.notes || "",
            };
            setFormData(updatedFormData);
            await submitDealData(updatedFormData);
          }
        }
      );
      return;
    }

    if (isEditMode && existingDeal && formData.assignTo !== existingDeal.assignedTo?._id) {
      try {
        const token = localStorage.getItem("token");
        const oldUserId = existingDeal.assignedTo?._id;
        if (oldUserId) {
          const res = await axios.get(
            `${API_URL}/tasks/reassignment-check/deal/${existingDeal._id}/${oldUserId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (res.data.hasActiveTasks || res.data.hasActiveTargets) {
            setReassignmentCheckData(res.data);
            setPendingSubmitData(formData);
            setReassignmentModalOpen(true);
            return;
          }
        }
      } catch (err) {
        console.error("Error checking reassignment:", err);
      }
    }

    await submitDealData(formData);
  };

  const handleReassignmentConfirm = async (payload) => {
    setReassignmentModalOpen(false);
    if (pendingSubmitData) {
      const dataToSubmit = {
        ...pendingSubmitData,
        taskAction: payload.taskAction,
        newTaskName: payload.newTaskName || null,
        extendedTaskDueDate: payload.extendedTaskDueDate ? payload.extendedTaskDueDate.toISOString() : null,
        extendedTaskDescription: payload.extendedTaskDescription || null,
        targetAction: payload.targetAction,
        extendedTargetEndDate: payload.extendedTargetEndDate ? payload.extendedTargetEndDate.toISOString() : null,
        extendedTargetDescription: payload.extendedTargetDescription || null,
      };
      await submitDealData(dataToSubmit);
      setPendingSubmitData(null);
    }
  };

  const handleBackClick = () => navigate(-1);

  const showAssignToField = userRole === "Admin";

  /* ── Dynamic custom fields (per card) ─────────────────────── */
  const toggleDraftCard = (cardTitle) => {
    const willOpen = !draftOpen[cardTitle];
    setDraftOpen((prev) => ({ ...prev, [cardTitle]: willOpen }));
    if (willOpen && !(draftRows[cardTitle]?.length)) {
      setDraftRows((prev) => ({
        ...prev,
        [cardTitle]: [{ id: nextCustomFieldId(), name: "", type: "text", options: "" }],
      }));
    }
  };

  const addDraftRow = (cardTitle) => {
    setDraftRows((prev) => ({
      ...prev,
      [cardTitle]: [
        ...(prev[cardTitle] || []),
        { id: nextCustomFieldId(), name: "", type: "text", options: "" },
      ],
    }));
  };

  const updateDraftRow = (cardTitle, rowId, key, value) => {
    setDraftRows((prev) => ({
      ...prev,
      [cardTitle]: (prev[cardTitle] || []).map((r) =>
        r.id === rowId ? { ...r, [key]: value } : r
      ),
    }));
  };

  const removeDraftRow = (cardTitle, rowId) => {
    setDraftRows((prev) => ({
      ...prev,
      [cardTitle]: (prev[cardTitle] || []).filter((r) => r.id !== rowId),
    }));
  };

  const cancelDraftCard = (cardTitle) => {
    setDraftRows((prev) => ({ ...prev, [cardTitle]: [] }));
    setDraftOpen((prev) => ({ ...prev, [cardTitle]: false }));
  };

  const saveDraftCard = (cardTitle) => {
    const rows = draftRows[cardTitle] || [];
    const validRows = rows.filter((r) => r.name.trim());

    if (validRows.length === 0) {
      cancelDraftCard(cardTitle);
      return;
    }

    const newFields = validRows.map((r) => ({
      id: r.id,
      cardTitle,
      name: r.name.trim(),
      type: r.type,
      options:
        r.type === "dropdown"
          ? r.options.split(",").map((o) => o.trim()).filter(Boolean)
          : [],
      value: "",
    }));

    setCustomFields((prev) => [...prev, ...newFields]);
    cancelDraftCard(cardTitle);
  };

  const updateCustomFieldValue = (id, value) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value } : f))
    );
  };

  const removeCustomField = (id) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const AddFieldButton = ({ cardTitle }) => (
    <button
      type="button"
      onClick={() => toggleDraftCard(cardTitle)}
      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50 transition"
    >
      <Plus size={14} /> Add Field
    </button>
  );

  const renderCommittedCustomFields = (cardTitle) =>
    customFields
      .filter((f) => f.cardTitle === cardTitle)
      .map((f) => (
        <div key={f.id} className={f.type === "textarea" ? "md:col-span-3" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            {f.name}
            <span className="text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
              Custom
            </span>
            <button
              type="button"
              onClick={() => removeCustomField(f.id)}
              className="ml-auto text-gray-400 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </label>

          {f.type === "textarea" ? (
            <textarea
              rows={4}
              value={f.value}
              onChange={(e) => updateCustomFieldValue(f.id, e.target.value)}
              placeholder={`Enter ${f.name}`}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 placeholder-gray-400 transition resize-none"
            />
          ) : f.type === "dropdown" ? (
            <select
              value={f.value}
              onChange={(e) => updateCustomFieldValue(f.id, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11"
            >
              <option value="">Select {f.name}</option>
              {f.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={f.type}
              value={f.value}
              onChange={(e) => updateCustomFieldValue(f.id, e.target.value)}
              placeholder={`Enter ${f.name}`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11"
            />
          )}
        </div>
      ));

  const renderCustomFieldDraftPanel = (cardTitle) =>
    draftOpen[cardTitle] && (
      <div className="space-y-3 bg-indigo-50 border border-dashed border-indigo-300 rounded-lg p-4 mt-4">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
          New fields (not saved yet)
        </p>

        {(draftRows[cardTitle] || []).map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr_auto] gap-3 items-end"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1">Field name</label>
              <input
                type="text"
                value={row.name}
                placeholder="e.g. PO Number"
                onChange={(e) => updateDraftRow(cardTitle, row.id, "name", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Field type</label>
              <select
                value={row.type}
                onChange={(e) => updateDraftRow(cardTitle, row.id, "type", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="textarea">Textarea</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>

            {row.type === "dropdown" ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Options (comma sep.)</label>
                <input
                  type="text"
                  value={row.options}
                  placeholder="e.g. Yes, No"
                  onChange={(e) => updateDraftRow(cardTitle, row.id, "options", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none"
                />
              </div>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => removeDraftRow(cardTitle, row.id)}
              className="h-[38px] w-[38px] flex items-center justify-center rounded-md border border-gray-300 text-gray-400 hover:text-red-500 hover:border-red-300"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => addDraftRow(cardTitle)}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            + Add another field
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => cancelDraftCard(cardTitle)}
            className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveDraftCard(cardTitle)}
            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Save Fields
          </button>
        </div>
      </div>
    );

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
        { value: "Closed Won", label: "Deal Closed" },
        { value: "Closed Lost", label: "Deal Lost" },
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
      options: [...STANDARD_INDUSTRIES, "Other"],
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

      {renderLostDealModal()}

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
            <h1 className="text-gray-900">
              {isEditMode ? "Edit Deal" : "Create New Deal"}
            </h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6 md:space-y-10">
          {/* Deal Info */}
          <div className="space-y-4 md:space-y-6 p-4 md:p-6 border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="border-b pb-2 text-blue-500">
                Deal Information
              </h2>
              <AddFieldButton cardTitle="Deal Information" />
            </div>

            {formData.stage === "Closed Lost" && formData.lossReason && (
              <div className="md:col-span-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-red-700 mb-1">Loss Information</h3>
                <p className="text-base text-slate-600">
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
                      <>
                        <select
                          name={field.name}
                          value={
                            field.name === "industry" && isCustomIndustry
                              ? "Other"
                              : (formData[field.name] || "")
                          }
                          onChange={(e) => {
                            if (field.name === "industry") {
                              if (e.target.value === "Other") {
                                setIsCustomIndustry(true);
                                setFormData((p) => ({ ...p, industry: "" }));
                              } else {
                                setIsCustomIndustry(false);
                                handleChange(e);
                              }
                            } else {
                              handleChange(e);
                            }
                          }}
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
                        {field.name === "industry" && isCustomIndustry && (
                          <input
                            type="text"
                            placeholder="Enter custom industry (e.g. influencer, service, finance, accounts)"
                            value={formData.industry || ""}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, industry: e.target.value }))
                            }
                            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11"
                          />
                        )}
                      </>
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
                      {field.name === "phoneNumber" && duplicateHints.phoneNumber?.exists && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠ This phone number is already used by "{duplicateHints.phoneNumber.dealName}"
                        </p>
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
                      {field.name === "email" && duplicateHints.email?.exists && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠ This email is already used by "{duplicateHints.email.dealName}"
                        </p>
                      )}
                    </>
                  )}
                  {errors[field.name] &&
                    !["phoneNumber", "email", "alternativeNumber", "alternativeEmail"].includes(field.name) && (
                      <p className="text-red-500 text-sm mt-1">{field.label} is required</p>
                    )}
                </div>
              ))}

              {renderCommittedCustomFields("Deal Information")}
            </div>

            {renderCustomFieldDraftPanel("Deal Information")}
          </div>

          {/* Location Section */}
          <div className="p-4 md:p-6 border border-gray-200 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-2">
              <h2 className="text-lg font-semibold text-teal-600 flex items-center gap-2">
                <MapPin size={18} /> Location
              </h2>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isFetchingLocation}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-teal-300 text-teal-700 hover:bg-teal-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LocateFixed size={16} />
                {isFetchingLocation ? "Fetching location..." : "Use Current Location"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address or use current location"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 placeholder-gray-400 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter City"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Enter State"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="Enter Pincode"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  name="country"
                  value={formData.country || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11"
                >
                  <option value="">Select Country</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude || ""}
                  onChange={handleChange}
                  placeholder="Auto-filled via current location, or enter manually"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude || ""}
                  onChange={handleChange}
                  placeholder="Auto-filled via current location, or enter manually"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition h-11"
                />
              </div>
            </div>
          </div>

          {/* Follow-up Section */}
          <div className="p-4 md:p-6 border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-semibold text-purple-600 flex items-center gap-2">
                <Clock size={18} /> Follow-up
              </h2>
              <AddFieldButton cardTitle="Follow-up" />
            </div>
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

            {customFields.some((f) => f.cardTitle === "Follow-up") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {renderCommittedCustomFields("Follow-up")}
              </div>
            )}
            {renderCustomFieldDraftPanel("Follow-up")}
          </div>

          {/* Management */}
          {showAssignToField && (
            <div className="p-4 md:p-6 border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="border-b pb-2 text-yellow-600">
                  Management
                </h2>
                <AddFieldButton cardTitle="Management" />
              </div>
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
                </div>

                {renderCommittedCustomFields("Management")}
              </div>

              {renderCustomFieldDraftPanel("Management")}
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
            <h2 className="text-slate-900 border-b pb-2">
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
                      className="text-xs text-red-600 hover:underline mt-1"
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
                        <p className="text-xs text-gray-700 truncate w-full text-center">
                          {file.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx, "new")}
                          className="text-xs text-red-600 hover:underline mt-1"
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
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Images */}
          <div className="p-6 border rounded-xl shadow-sm">
            <h2 className="text-slate-900 border-b pb-2">
              Images
            </h2>

            {existingImages.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {existingImages.map((image, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center w-full bg-white border rounded-xl shadow-sm p-3 relative group"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx, "existing")}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    <img
                      src={buildImageUrl(image.filePath)}
                      alt={image.fileName}
                      className="w-16 h-16 object-cover rounded-md mb-1 cursor-pointer"
                      onClick={() => handleFileDownload(image.filePath)}
                    />
                    <p className="text-xs text-indigo-600 truncate w-full text-center">
                      {image.fileName}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Upload new images */}
            <div className="mt-4">
              <label
                htmlFor="images"
                className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition p-6"
              >
                {formData.images.length === 0 ? (
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
                      Click to browse images (Max 5 images, 20MB each)
                    </span>
                  </>
                ) : (
                  <div className="w-full flex flex-wrap gap-4">
                    {formData.images.map((image, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center justify-center w-28 h-28 bg-white border rounded-xl shadow-sm p-2 relative group"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx, "new");
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                        <img
                          src={URL.createObjectURL(image)}
                          alt={image.name}
                          className="w-16 h-16 object-cover rounded-md mb-1"
                        />
                        <p className="text-xs text-gray-500">
                          {(image.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-gray-700 truncate w-full text-center">
                          {image.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleImageChange(e);
                    e.target.value = "";
                  }}
                  className="hidden"
                  disabled={formData.images.length + existingImages.length >= 5}
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

      <ReassignmentModal
        isOpen={reassignmentModalOpen}
        onClose={() => setReassignmentModalOpen(false)}
        onConfirm={handleReassignmentConfirm}
        hasTasks={reassignmentCheckData?.hasActiveTasks}
        hasTargets={reassignmentCheckData?.hasActiveTargets}
        itemType="deal"
      />
    </div>
  );
}