import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import { getNames } from "country-list";
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Globe,
  Building2,
  Briefcase,
  UserCheck,
  Calendar,
  StickyNote,
  ArrowLeft,
  Upload,
  X,
  Users,
  LocateFixed,
  Plus,
} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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

export default function CreateLeads() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const location = useLocation();
  const contactFormData = location.state?.contactFormData || null;
  const queryParams = new URLSearchParams(location.search);
  const leadId = queryParams.get("id"); // edit mode if exists

  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  // Live "already exists" hints — { exists: true, leadName } | { exists: false } | undefined
  const [duplicateHints, setDuplicateHints] = useState({});
  const [isAutoAssigned, setIsAutoAssigned] = useState(false);
  const [isCustomIndustry, setIsCustomIndustry] = useState(false);
  // Documents only — photos have their own dedicated Images field/upload
  // below, so Attachments no longer accepts image mimetypes.
  const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ];

  const [formData, setFormData] = useState({
    leadName: "",
    phoneNumber: "",
    alternatePhoneNumber: "",
    email: "",
    alternateEmail: "",
    source: "",
    companyName: "",
    industry: "",
    requirement: "",
    status: "Cold",
    assignTo: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    latitude: "",
    longitude: "",
    followUpDate: "",
    notes: "",
    clientType: "",
    NumberOfEmployees: "",
    attachments: [],
    images: [],
  });

  const [errors, setErrors] = useState({});
  const [salesUsers, setSalesUsers] = useState([]);
  const [countries] = useState(getNames());
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState("in");
  const [followUpDateObj, setFollowUpDateObj] = useState(null);
  const followUpDateRef = useRef(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Dynamic (per-card) custom fields
  const [customFields, setCustomFields] = useState([]); // committed: [{id, cardTitle, name, type, options, value}]
  const [draftRows, setDraftRows] = useState({}); // { [cardTitle]: [{id, name, type, options}] }
  const [draftOpen, setDraftOpen] = useState({}); // { [cardTitle]: bool }
  const customFieldIdRef = useRef(0);
  const nextCustomFieldId = () => `cf-${Date.now()}-${customFieldIdRef.current++}`;

  const [originalAssignTo, setOriginalAssignTo] = useState(null);
  const [reassignmentModalOpen, setReassignmentModalOpen] = useState(false);
  const [reassignmentCheckData, setReassignmentCheckData] = useState(null);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [rawNotesArray, setRawNotesArray] = useState([]);

  //  Load user role and ID - Only auto-assign for new leads and if not already assigned
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role?.name || "");
      setUserId(user._id || "");
      
      // Only auto-assign for NEW leads (not edit mode) and if no assignee is selected
      if (!leadId && user.role?.name !== "Admin" && !formData.assignTo && !isAutoAssigned) {
        setFormData(prev => ({ ...prev, assignTo: user._id }));
        setIsAutoAssigned(true);
        console.log("Auto-assigned to:", user._id);
      }
    }
  }, [leadId, formData.assignTo, isAutoAssigned]);

  //  Fetch sales users for ALL users
  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/users/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const salesData =
          response.data.salesUsers || response.data.users || response.data;
        setSalesUsers(Array.isArray(salesData) ? salesData : []);
      } catch (error) {
        console.error("Error fetching sales users:", error);
      }
    };

    fetchSalesUsers();
  }, [API_URL]);

  useEffect(() => {
    if (!contactFormData) return;
    if (leadId) return;

    setFormData((prev) => ({
      ...prev,
      leadName: contactFormData.name || "",
      email: contactFormData.email || "",
      phoneNumber: contactFormData.phone || "",
      companyName: contactFormData.companyName || "",
      requirement: contactFormData.requirement || "",
      source: "Website",
      address: contactFormData.address || "",
      city: contactFormData.city || "",
      state: contactFormData.state || "",
      pincode: contactFormData.pincode || "",
      country: contactFormData.country || "",
      industry: contactFormData.industry || "",
      clientType: contactFormData.clientType || "",
      notes: (() => {
        try {
          if (contactFormData.notes) {
            const parsed = JSON.parse(contactFormData.notes);
            if (Array.isArray(parsed)) {
              setRawNotesArray(parsed);
              return parsed.length > 0 ? parsed[0].text : "";
            }
          }
        } catch (e) {}
        setRawNotesArray([]);
        return contactFormData.notes || "";
      })(),
    }));
    const isCustom = contactFormData.industry && !STANDARD_INDUSTRIES.includes(contactFormData.industry);
    setIsCustomIndustry(!!isCustom);
    setExistingAttachments(contactFormData.attachments || []);
    setExistingImages(contactFormData.images || []);
  }, [contactFormData, leadId]);

  //  Fetch lead if editing
  useEffect(() => {
    if (leadId) {
      const fetchLead = async () => {
        try {
          setIsLoading(true);
          const token = localStorage.getItem("token");
          const response = await axios.get(
            `${API_URL}/leads/getLead/${leadId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const leadData = response.data;

          const isCustom = leadData.industry && !STANDARD_INDUSTRIES.includes(leadData.industry);
          setIsCustomIndustry(!!isCustom);

          setExistingAttachments(leadData.attachments || []);
          setExistingImages(leadData.images || []);
          setFormData({
            leadName: leadData.leadName || "",
            companyName: leadData.companyName || "",
            phoneNumber: leadData.phoneNumber || "",
            alternatePhoneNumber: leadData.alternatePhoneNumber || "",
            email: leadData.email || "",
            alternateEmail: leadData.alternateEmail || "",
            source: leadData.source || "",
            industry: leadData.industry || "",
            clientType: leadData.clientType || "",
            NumberOfEmployees: leadData.NumberOfEmployees ?? "",
            requirement: leadData.requirement || "",
            status: leadData.status || "Cold",
            assignTo: leadData.assignTo?._id || "",
            address: leadData.address || "",
            city: leadData.city || "",
            state: leadData.state || "",
            pincode: leadData.pincode || "",
            country: leadData.country || "",
            latitude: leadData.latitude || "",
            longitude: leadData.longitude || "",
            followUpDate: leadData.followUpDate
              ? (() => {
                  const d = new Date(leadData.followUpDate);
                  setFollowUpDateObj(d);
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  return `${mm}/${dd}/${d.getFullYear()}`;
                })()
              : "",
            notes: (() => {
              try {
                if (leadData.notes) {
                  const parsed = JSON.parse(leadData.notes);
                  if (Array.isArray(parsed)) {
                    setRawNotesArray(parsed);
                    return parsed.length > 0 ? parsed[0].text : "";
                  }
                }
              } catch (e) {}
              setRawNotesArray([]);
              return leadData.notes || "";
            })(),
            attachments: [],
            images: [],
          });
          setOriginalAssignTo(leadData.assignTo?._id || null);
          setCustomFields(
            (leadData.customFields || []).map((f) => ({
              id: nextCustomFieldId(),
              cardTitle: f.cardTitle || "",
              name: f.name || "",
              type: f.type || "text",
              options: f.options || [],
              value: f.value || "",
            }))
          );
        } catch (error) {
          console.error("Error fetching lead:", error);
          toast.error("Failed to fetch lead data");
        } finally {
          setIsLoading(false);
        }
      };
      fetchLead();
    }
  }, [leadId, API_URL]);

  const getSalesUsersOptions = () => {
    return salesUsers.map((u) => ({
      label: `${u.firstName} ${u.lastName}`,
      value: u._id,
    }));
  };

  //  Validate email domain
  const validateEmailDomain = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    const domain = email.split("@")[1];
    if (!domain) return false;
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  const validatePhoneNumber = (phone, countryCode = "in") => {
  if (!phone) return false;

  // remove country code (91) if exists
  let digits = String(phone).replace(/\D/g, "");

  if (countryCode === "in") {
    // remove 91 if present
    if (digits.startsWith("91")) {
      digits = digits.slice(2);
    }

    // must be exactly 10 digits and start with 6-9
    return /^[6-9]\d{9}$/.test(digits);
  }

  // fallback for other countries
  return digits.length >= 8 && digits.length <= 15;
};

  //  Get phone number length requirement message
  const getPhoneNumberLengthMessage = (countryCode) => {
    const lengths = {
      in: "10 digits (starting with 6-9)",
      us: "10 digits (e.g., 2125551234)",
      gb: "10-11 digits (e.g., 7911123456)",
      ca: "10 digits (e.g., 4165551234)",
      au: "9-10 digits (e.g., 412345678)",
      de: "10-11 digits (e.g., 1512345678)",
      fr: "9-10 digits (e.g., 612345678)",
      jp: "10-11 digits (e.g., 9012345678)",
      cn: "11 digits (e.g., 13912345678)",
      br: "11 digits (e.g., 11987654321)",
      ru: "10-11 digits (e.g., 9123456789)",
    };
    return lengths[countryCode] || "8-15 digits with country code";
  };

  const validateFollowUpDate = (value) => {
    if (!value) return null;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return "Enter date in mm/dd/yyyy format (e.g., 07/01/2026)";
    }
    const [mm, dd, yyyy] = value.split("/").map(Number);
    if (mm < 1 || mm > 12) {
      return "Invalid month. Must be between 01 and 12";
    }
    const dateObj = new Date(yyyy, mm - 1, dd);
    if (
      dateObj.getFullYear() !== yyyy ||
      dateObj.getMonth() !== mm - 1 ||
      dateObj.getDate() !== dd
    ) {
      return "Invalid date. Please enter a real date in mm/dd/yyyy format";
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj < today) {
      return "Follow-up date must be today or a future date";
    }
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));

    if (name === "assignTo") {
      setIsAutoAssigned(true);
    }

    if (name === "followUpDate" && fieldErrors.followUpDate) {
      const err = validateFollowUpDate(value);
      setFieldErrors((p) => ({ ...p, followUpDate: err || "" }));
      setErrors((p) => ({ ...p, followUpDate: !!err }));
    } else {
      if (errors[name]) {
        setErrors((p) => ({ ...p, [name]: false }));
      }
      if (fieldErrors[name]) {
        setFieldErrors((p) => ({ ...p, [name]: "" }));
      }
    }
  };

  // Live "this email/phone is already used by another lead" hint — debounced
  // so it doesn't fire an API call on every keystroke. In edit mode the
  // lead's own current email/phone must be excluded, or it would always
  // flag itself as a duplicate of itself.
  useEffect(() => {
    const email = formData.email?.trim();
    const phoneNumber = formData.phoneNumber?.trim();

    // Clear any stale hint the moment its field is emptied, rather than
    // leaving a "already used by X" warning showing for a blank field.
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
        if (leadId) params.excludeId = leadId;
        const res = await axios.get(`${API_URL}/leads/check-duplicate`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setDuplicateHints((prev) => ({ ...prev, ...res.data }));
      } catch {
        // Non-critical UI hint — a failed check just means no hint shows.
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email, formData.phoneNumber, leadId, API_URL]);

  const handleFollowUpDateChange = (date) => {
    setFollowUpDateObj(date);
    if (date) {
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const yyyy = date.getFullYear();
      const formatted = `${mm}/${dd}/${yyyy}`;
      setFormData((p) => ({ ...p, followUpDate: formatted }));
      if (fieldErrors.followUpDate) {
        const err = validateFollowUpDate(formatted);
        setFieldErrors((p) => ({ ...p, followUpDate: err || "" }));
        setErrors((p) => ({ ...p, followUpDate: !!err }));
      }
    } else {
      setFormData((p) => ({ ...p, followUpDate: "" }));
      setFieldErrors((p) => ({ ...p, followUpDate: "" }));
      setErrors((p) => ({ ...p, followUpDate: false }));
    }
  };

  const handlePhoneChange = (phone, countryData) => {
    setFormData((p) => ({ ...p, phoneNumber: phone }));
    setPhoneCountryCode(countryData.countryCode);
    
    console.log("Phone changed:", phone, "Country code:", countryData.countryCode);

    if (errors.phoneNumber) {
      setErrors((p) => ({ ...p, phoneNumber: false }));
    }
    if (fieldErrors.phoneNumber) {
      setFieldErrors((p) => ({ ...p, phoneNumber: "" }));
    }
  };

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

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
/* ── Handle Drag Leave Function ─────────────────────── */
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  /* ── Handle Drop Function ─────────────────────── */
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

/* ── Process Files Function ─────────────────────── */

  const processFiles = (files) => {
    const totalFiles =
      formData.attachments.length + files.length + existingAttachments.length;

    if (totalFiles > 5) {
      toast.error("Maximum 5 attachments allowed");
      return;
    }

    const invalidFiles = files.filter(
      (file) => !ALLOWED_FILE_TYPES.includes(file.type)
    );

    if (invalidFiles.length > 0) {
      toast.error("Only PDF, Word, Excel, or PowerPoint files are allowed — use the Images section for photos");
      return;
    }

    const oversizedFiles = files.filter((file) => file.size > 20 * 1024 * 1024);

    if (oversizedFiles.length > 0) {
      toast.error("Some files exceed the 20MB size limit");
      return;
    }

    setFormData((p) => ({
      ...p,
      attachments: [...p.attachments, ...files],
    }));
  };

/* ── Handle File Change Function ─────────────────────── */
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

/* ──Remove File Function ─────────────────────── */
  const handleRemoveFile = (idx, type = "new") => {
    if (type === "new") {
      setFormData((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== idx),
      }));
    } else {
      setExistingAttachments((prev) => prev.filter((_, i) => i !== idx));
    }
  };

/* ── Process Images Function ─────────────────────── */

  const processImages = (files) => {
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
    setFormData((p) => ({ ...p, images: [...p.images, ...files] }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    processImages(files);
  };

  const handleRemoveImage = (idx, type = "new") => {
    if (type === "new") {
      setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
    } else {
      setExistingImages((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  // Dedicated drag-drop state/handlers for the Images dropzone — reusing the
  // Attachments section's handleDrop would route dropped files through
  // processFiles (the documents-only validator) instead of processImages.
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const handleImageDragOver = (e) => {
    e.preventDefault();
    setIsDraggingImages(true);
  };
  const handleImageDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingImages(false);
  };
  const handleImageDrop = (e) => {
    e.preventDefault();
    setIsDraggingImages(false);
    processImages(Array.from(e.dataTransfer.files));
  };

  // /uploads is served as public static files (see app.js), so an already-
  // uploaded image can be shown directly — no authenticated fetch needed.
  const buildImageUrl = (path) =>
    `${API_URL.replace("/api", "")}/${String(path || "").replace(/^\/+/, "")}`;

/* ──Form Validation Function ─────────────────────── */
  const validateForm = () => {
    const newErrors = {};
    const newFieldErrors = {};

    if (!formData.leadName.trim()) {
      newErrors.leadName = true;
      newFieldErrors.leadName = "Lead name is required";
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = true;
      newFieldErrors.companyName = "Company name is required";
    }

    // Phone validation - FIXED: use phoneCountryCode state
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = true;
      newFieldErrors.phoneNumber = "Phone number is required";
    } else if (!validatePhoneNumber(formData.phoneNumber, phoneCountryCode)) {
      newErrors.phoneNumber = true;
      newFieldErrors.phoneNumber = `Please enter a valid phone number (${getPhoneNumberLengthMessage(phoneCountryCode)})`;
      newFieldErrors.phoneNumber =
  "Enter valid Indian number (10 digits, starts with 6-9)";
      console.log("Phone validation failed for:", formData.phoneNumber, "Country:", phoneCountryCode);
    }

    if (formData.email.trim() && !validateEmailDomain(formData.email)) {
      newErrors.email = true;
      newFieldErrors.email =
        "Please enter a valid email address with a proper domain (e.g., name@company.com)";
    }

    if (formData.alternateEmail.trim() && !validateEmailDomain(formData.alternateEmail)) {
      newErrors.alternateEmail = true;
      newFieldErrors.alternateEmail =
        "Please enter a valid email address with a proper domain (e.g., name@company.com)";
    }

    if (
      formData.alternatePhoneNumber &&
      !validatePhoneNumber(formData.alternatePhoneNumber, phoneCountryCode)
    ) {
      newErrors.alternatePhoneNumber = true;
      newFieldErrors.alternatePhoneNumber = `Please enter a valid phone number (${getPhoneNumberLengthMessage(phoneCountryCode)})`;
    }

    if (formData.followUpDate) {
      const dateErr = validateFollowUpDate(formData.followUpDate);
      if (dateErr) {
        newErrors.followUpDate = true;
        newFieldErrors.followUpDate = dateErr;
      }
    }

    setErrors(newErrors);
    setFieldErrors(newFieldErrors);

    if (newFieldErrors.followUpDate) {
      setTimeout(() => followUpDateRef.current?.setFocus(), 50);
    }

    return Object.keys(newErrors).length === 0;
  };

/* ── Handle Submit Function ─────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setFieldErrors({});

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    if (leadId && originalAssignTo && formData.assignTo !== originalAssignTo) {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${API_URL}/tasks/reassignment-check/lead/${leadId}/${originalAssignTo}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (res.data.hasActiveTasks || res.data.hasActiveTargets) {
          setReassignmentCheckData(res.data);
          setPendingSubmitData(formData);
          setReassignmentModalOpen(true);
          return;
        }
      } catch (err) {
        console.error("Error checking reassignment:", err);
      }
    }

    setIsSubmitting(true);
    await submitLeadData(formData);
  };

  const submitLeadData = async (dataToSubmit) => {
    try {
      const token = localStorage.getItem("token");
      const dataToSend = new FormData();

      for (let key in dataToSubmit) {
        if (["taskAction", "extendedTaskDueDate", "extendedTaskDescription", "targetAction", "extendedTargetEndDate", "extendedTargetDescription"].includes(key)) {
          if (dataToSubmit[key] !== null && dataToSubmit[key] !== undefined) {
            dataToSend.append(key, dataToSubmit[key]);
          }
          continue;
        }
        if (key === "attachments") {
          dataToSubmit.attachments.forEach((file) => dataToSend.append("attachments", file));
        } else if (key === "images") {
          dataToSubmit.images.forEach((file) => dataToSend.append("images", file));
        } else if (key === "followUpDate" && dataToSubmit.followUpDate) {
          const [mm, dd, yyyy] = dataToSubmit.followUpDate.split("/");
          dataToSend.append(key, `${yyyy}-${mm}-${dd}`);
        } else if (key === "phoneNumber" && dataToSubmit.phoneNumber) {
          const rawPhone = String(dataToSubmit.phoneNumber).trim();
          const formattedPhone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;
          dataToSend.append(key, formattedPhone);
        } else if (key === "alternatePhoneNumber" && dataToSubmit.alternatePhoneNumber) {
          const rawPhone = String(dataToSubmit.alternatePhoneNumber).trim();
          const formattedPhone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;
          dataToSend.append(key, formattedPhone);
        } else if (key === "notes") {
          let updatedNotesString = dataToSubmit.notes;
          if (rawNotesArray.length > 0) {
            const updatedArray = [...rawNotesArray];
            updatedArray[0] = { ...updatedArray[0], text: dataToSubmit.notes };
            updatedNotesString = JSON.stringify(updatedArray);
          }
          dataToSend.append(key, updatedNotesString);
        } else {
          dataToSend.append(key, dataToSubmit[key]);
        }
      }

      dataToSend.append(
        "existingAttachments",
        JSON.stringify(existingAttachments)
      );
      dataToSend.append("existingImages", JSON.stringify(existingImages));

      dataToSend.append(
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

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${progress}%`);
        },
      };

      if (leadId) {
        await axios.put(
          `${API_URL}/leads/updateLead/${leadId}`,
          dataToSend,
          config
        );
        toast.success("Lead updated successfully");
      } else {
        await axios.post(`${API_URL}/leads/create`, dataToSend, config);
        toast.success("Lead created successfully");
      }

      setTimeout(() => navigate(`/${tenantSlug}/leads`), 1200);
    } catch (err) {
      console.error("Error submitting form:", err);

      if (err.response?.data?.message) {
        const errorMsg = err.response.data.message.toLowerCase();

        if (errorMsg.includes("email") && errorMsg.includes("already")) {
          setFieldErrors({
            email: "This email is already associated with another lead",
          });
          setErrors({ email: true });
          toast.error("Email already exists");
        } else if (errorMsg.includes("phone") && errorMsg.includes("already")) {
          setFieldErrors({
            phoneNumber:
              "This phone number is already associated with another lead",
          });
          setErrors({ phoneNumber: true });
          toast.error("Phone number already exists");
        } else if (errorMsg.includes("name") && errorMsg.includes("already")) {
          setFieldErrors({ leadName: "This lead name already exists" });
          setErrors({ leadName: true });
          toast.error("Lead name already exists");
        } else if (
          (errorMsg.includes("file") && errorMsg.includes("large")) ||
          errorMsg.includes("size")
        ) {
          toast.error("File size exceeds the 20MB limit");
        } else if (err.response.data.errors) {
          const backendErrors = err.response.data.errors;
          const newFieldErrors = {};
          Object.keys(backendErrors).forEach((key) => {
            newFieldErrors[key] =
              backendErrors[key].message || backendErrors[key];
            setErrors((prev) => ({ ...prev, [key]: true }));
          });
          setFieldErrors(newFieldErrors);
          toast.error("Please check the form for errors");
        } else {
          toast.error(
            err.response.data.message ||
              (leadId ? "Failed to update lead" : "Failed to create lead")
          );
        }
      } else if (err.message?.includes("Network Error")) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassignmentConfirm = async (payload) => {
    setReassignmentModalOpen(false);
    if (pendingSubmitData) {
      setIsSubmitting(true);
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
      await submitLeadData(dataToSubmit);
      setPendingSubmitData(null);
    }
  };

  const handleBackClick = () => navigate(-1);

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

  const fieldGroups = [
    {
      title: "Basic Information",
      color: "text-blue-600",
      fields: [
        { name: "leadName", label: "Lead Name", icon: <User size={16} /> },
        {
          name: "companyName",
          label: "Company Name",
          icon: <Building2 size={16} />,
        },
        {
          name: "phoneNumber",
          label: "Phone Number",
          icon: <Phone size={16} />,
        },
        {
          name: "alternatePhoneNumber",
          label: "Alternate Phone Number",
          icon: <Phone size={16} />,
        },
        { name: "email", label: "Email", icon: <Mail size={16} /> },
        { name: "alternateEmail", label: "Alternate Email", icon: <Mail size={16} /> },
      ],
    },
    {
      title: "Business Details",
      color: "text-green-600",
      fields: [
        {
          name: "clientType",
          label: "Client Type",
          icon: <Building2 size={16} />,
          type: "select",
          options: ["B2B", "B2C"],
        },
        {
          name: "industry",
          label: "Industry",
          icon: <Briefcase size={16} />,
          type: "select",
          options: [
            ...STANDARD_INDUSTRIES,
            "Other",
          ],
        },
        {
          name: "source",
          label: "Source",
          icon: <Globe size={16} />,
          type: "select",
          options: [
            "Website",
            "Referral",
            "Social Media",
            "Email",
            "Phone",
            "Other",
          ],
        },
        {
          name: "requirement",
          label: "Requirement",
          icon: <FileText size={16} />,
        },
         {
          name: "NumberOfEmployees",
          label: "Number of Employees",
          icon: <Users size={16} />,
          type: "number",
        },
      ],
    },
    {
      title: "Lead Management",
      color: "text-yellow-600",
      fields: [
        {
          name: "status",
          label: "Status",
          icon: <UserCheck size={16} />,
          type: "select",
          options: ["Hot", "Warm", "Cold", "Junk"],
        },
        ...(userRole !== "Sales"
          ? [
              {
                name: "assignTo",
                label: "Assign To",
                icon: <User size={16} />,
                type: "select",
                options: getSalesUsersOptions(),
              },
            ]
          : []),
        {
          name: "followUpDate",
          label: "Follow-up Date",
          icon: <Calendar size={16} />,
        },
      ],
    },
    {
      title: "Additional Information",
      color: "text-purple-600",
      fields: [
        {
          name: "notes",
          label: "Notes",
          icon: <StickyNote size={16} />,
          type: "textarea",
        },
      ],
    },
  ];

  const renderFieldGroup = (group) => (
    <div
      key={group.title}
      className="space-y-6 p-6 border border-gray-200 rounded-xl shadow-sm"
    >
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className={`border-b pb-2 ${group.color}`}>
          {group.title}
        </h2>
        <button
          type="button"
          onClick={() => toggleDraftCard(group.title)}
          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50 transition"
        >
          <Plus size={14} /> Add Field
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {group.fields.map((field) => (
          <div
            key={field.name}
            className={`${field.type === "textarea" ? "md:col-span-3" : ""}`}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              {field.icon} {field.label}
              {(field.name === "leadName" || field.name === "companyName" || field.name === "phoneNumber") && (
                <span className="text-red-500">*</span>
              )}
            </label>

            {field.name === "phoneNumber" ? (
              <div>
                <div
                  className={`border rounded-lg ${
                    errors.phoneNumber
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                >
                 <PhoneInput
  country={"in"}
  preferredCountries={["in"]}
  countryCodeEditable={false} // 👈 prevents editing +91 manually
  disableDropdown={false}
  value={formData.phoneNumber}
  onChange={(phone, countryData) => {
    const dialCode = countryData.dialCode;

    // If user tries to delete country code
    if (!phone || !phone.startsWith(dialCode)) {
      setFormData((prev) => ({
        ...prev,
        phoneNumber: dialCode,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      phoneNumber: phone,
    }));

    setPhoneCountryCode(countryData.countryCode);
  }}
  placeholder="Select code and enter number"
  specialLabel=""

  inputStyle={{
    width: "100%",
    height: "42px",
    fontSize: "0.875rem",
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
                {fieldErrors.phoneNumber && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors.phoneNumber}
                  </p>
                )}
                {formData.phoneNumber &&
                  !fieldErrors.phoneNumber && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Valid phone number
                    </p>
                  )}
                {duplicateHints.phoneNumber?.exists && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ This phone number is already used by "{duplicateHints.phoneNumber.leadName}"
                  </p>
                )}
              </div>
            ) : field.name === "alternatePhoneNumber" ? (
              <div>
                <div
                  className={`border rounded-lg ${
                    errors.alternatePhoneNumber
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                >
                  <PhoneInput
                    country={"in"}
                    preferredCountries={["in"]}
                    countryCodeEditable={false}
                    disableDropdown={false}
                    value={formData.alternatePhoneNumber}
                    onChange={(phone, countryData) => {
                      const dialCode = countryData.dialCode;
                      if (phone && phone !== dialCode) {
                        setFormData((prev) => ({ ...prev, alternatePhoneNumber: phone }));
                      } else {
                        setFormData((prev) => ({ ...prev, alternatePhoneNumber: "" }));
                      }
                      if (errors.alternatePhoneNumber) {
                        setErrors((p) => ({ ...p, alternatePhoneNumber: false }));
                      }
                      if (fieldErrors.alternatePhoneNumber) {
                        setFieldErrors((p) => ({ ...p, alternatePhoneNumber: "" }));
                      }
                    }}
                    placeholder="Select code and enter number"
                    specialLabel=""
                    inputStyle={{
                      width: "100%",
                      height: "42px",
                      fontSize: "0.875rem",
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
                {fieldErrors.alternatePhoneNumber && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors.alternatePhoneNumber}
                  </p>
                )}
              </div>
            ) : field.type === "select" ? (
              <div>
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
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11 ${
                    errors[field.name]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map((opt) =>
                    typeof opt === "string" ? (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ) : (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    )
                  )}
                </select>
                {field.name === "industry" && isCustomIndustry && (
                  <input
                    type="text"
                    placeholder="Enter custom industry"
                    value={formData.industry || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, industry: e.target.value }))
                    }
                    className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11"
                  />
                )}
                {fieldErrors[field.name] && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors[field.name]}
                  </p>
                )}
              </div>
            ) : field.type === "textarea" ? (
              <div>
                <textarea
                  name={field.name}
                  rows={5}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  placeholder={`Enter ${field.label}...`}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 placeholder-gray-400 transition resize-none"
                  maxLength={500}
                />
                {fieldErrors[field.name] && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors[field.name]}
                  </p>
                )}
              </div>
            ) : field.name === "followUpDate" ? (
              <div>
                <DatePicker
                  ref={followUpDateRef}
                  selected={followUpDateObj}
                  onChange={handleFollowUpDateChange}
                  minDate={new Date()}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="mm/dd/yyyy"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  isClearable
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11 ${
                    errors.followUpDate
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  wrapperClassName="w-full"
                />
                {fieldErrors.followUpDate && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors.followUpDate}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type={field.type || "text"}
                  name={field.name}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  placeholder={field.placeholder || `Enter ${field.label}`}
                  maxLength={field.maxLength || undefined}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11 ${
                    errors[field.name]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {fieldErrors[field.name] && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors[field.name]}
                  </p>
                )}
                {field.name === "email" && duplicateHints.email?.exists && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ This email is already used by "{duplicateHints.email.leadName}"
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {customFields
          .filter((f) => f.cardTitle === group.title)
          .map((f) => (
            <div
              key={f.id}
              className={f.type === "textarea" ? "md:col-span-3" : ""}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                {f.name}
                <span className="text-[0.625rem] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
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
          ))}
      </div>

      {draftOpen[group.title] && (
        <div className="space-y-3 bg-indigo-50 border border-dashed border-indigo-300 rounded-lg p-4">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
            New fields (not saved yet)
          </p>

          {(draftRows[group.title] || []).map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr_auto] gap-3 items-end"
            >
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Field name
                </label>
                <input
                  type="text"
                  value={row.name}
                  placeholder="e.g. GST Number"
                  onChange={(e) =>
                    updateDraftRow(group.title, row.id, "name", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Field type
                </label>
                <select
                  value={row.type}
                  onChange={(e) =>
                    updateDraftRow(group.title, row.id, "type", e.target.value)
                  }
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
                  <label className="block text-xs text-gray-500 mb-1">
                    Options (comma sep.)
                  </label>
                  <input
                    type="text"
                    value={row.options}
                    placeholder="e.g. Yes, No"
                    onChange={(e) =>
                      updateDraftRow(group.title, row.id, "options", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none"
                  />
                </div>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => removeDraftRow(group.title, row.id)}
                className="h-[38px] w-[38px] flex items-center justify-center rounded-md border border-gray-300 text-gray-400 hover:text-red-500 hover:border-red-300"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => addDraftRow(group.title)}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              + Add another field
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => cancelDraftCard(group.title)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveDraftCard(group.title)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Save Fields
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-start justify-center py-10 px-4">
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
                {leadId ? "Edit Lead" : "Create New Lead"}
              </h1>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {renderFieldGroup(fieldGroups[0])}
            {renderFieldGroup(fieldGroups[1])}

            {/* Location Section */}
            <div className="space-y-6 p-6 border border-gray-200 rounded-xl shadow-sm">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 placeholder-gray-400 transition resize-none"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition h-11"
                  />
                </div>
              </div>
            </div>

            {fieldGroups.slice(2).map((group) => renderFieldGroup(group))}

            {/* Attachments Section */}
            <div className="space-y-6 p-6 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="border-b pb-2 text-indigo-600 flex items-center gap-2">
                <Upload size={20} /> Attachments
              </h2>

              <div className="space-y-4">
                <div
                  className={`flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed rounded-xl cursor-pointer transition p-6 ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("attachments").click()}
                >
                  <div className="w-full flex flex-wrap gap-4">
                    {existingAttachments.map((file, idx) => (
                      <div
                        key={`existing-${idx}`}
                        className="flex flex-col items-center justify-center w-28 h-28 bg-white border rounded-xl shadow-sm p-2 relative group"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx, "existing");
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                        <div className="w-12 h-12 flex items-center justify-center bg-indigo-100 rounded-md mb-1">
                          <span className="text-xs font-semibold text-indigo-600">
                            {file.name.split(".").pop().toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate w-full text-center">
                          {file.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx, "existing");
                          }}
                          className="text-xs text-red-600 hover:underline mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    {formData.attachments.map((file, idx) => (
                      <div
                        key={`new-${idx}`}
                        className="flex flex-col items-center justify-center w-28 h-28 bg-white border rounded-xl shadow-sm p-2 relative group"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx, "new");
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                        <div className="w-12 h-12 flex items-center justify-center bg-indigo-100 rounded-md mb-1">
                          <span className="text-xs font-semibold text-indigo-600">
                            {file.name.split(".").pop().toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-gray-700 truncate w-full text-center">
                          {file.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx, "new");
                          }}
                          className="text-xs text-red-600 hover:underline mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    {existingAttachments.length === 0 &&
                      formData.attachments.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center w-full">
                          <Upload size={48} className="text-indigo-300 mb-2" />
                          <p className="text-sm text-gray-600">
                            Drag & drop files here or click to browse
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Max 5 files, 20MB Limit
                          </p>
                        </div>
                      )}
                  </div>

                  <input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={
                      formData.attachments.length +
                        existingAttachments.length >=
                      5
                    }
                  />
                </div>

                <div className="text-sm text-gray-600 flex flex-wrap gap-4 items-center">
                  <div>
                    <span
                      className={`font-medium ${
                        formData.attachments.length +
                          existingAttachments.length >=
                        5
                          ? "text-red-500"
                          : "text-gray-600"
                      }`}
                    >
                      Files:{" "}
                      {formData.attachments.length + existingAttachments.length}
                      /5
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Max size:</span> 20MB
                  </div>
                  <div>
                    <span className="font-medium">Supported types:</span> PDF, Word, Excel, PowerPoint
                  </div>
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className="space-y-6 p-6 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="border-b pb-2 text-indigo-600 flex items-center gap-2">
                <Upload size={20} /> Images
              </h2>

              <div className="space-y-4">
                <div
                  className={`flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed rounded-xl cursor-pointer transition p-6 ${
                    isDraggingImages
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50"
                  }`}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                  onClick={() => document.getElementById("images").click()}
                >
                  <div className="w-full flex flex-wrap gap-4">
                    {existingImages.map((image, idx) => (
                      <div
                        key={`existing-${idx}`}
                        className="flex flex-col items-center justify-center w-28 h-28 bg-white border rounded-xl shadow-sm p-2 relative group"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx, "existing");
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                        <img
                          src={buildImageUrl(image.path)}
                          alt={image.name}
                          className="w-16 h-16 object-cover rounded-md mb-1"
                        />
                        <p className="text-xs text-gray-500 truncate w-full text-center">
                          {image.name}
                        </p>
                      </div>
                    ))}

                    {formData.images.map((image, idx) => (
                      <div
                        key={`new-${idx}`}
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

                    {existingImages.length === 0 &&
                      formData.images.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center w-full">
                          <Upload size={48} className="text-indigo-300 mb-2" />
                          <p className="text-sm text-gray-600">
                            Drag & drop images here or click to browse
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Max 5 images, 20MB Limit
                          </p>
                        </div>
                      )}
                  </div>

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
                    disabled={
                      formData.images.length +
                        existingImages.length >=
                      5
                    }
                  />
                </div>

                <div className="text-sm text-gray-600 flex flex-wrap gap-4 items-center">
                  <div>
                    <span
                      className={`font-medium ${
                        formData.images.length + existingImages.length >= 5
                          ? "text-red-500"
                          : "text-gray-600"
                      }`}
                    >
                      Images: {formData.images.length + existingImages.length}/5
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Max size:</span> 20MB
                  </div>
                  <div>
                    <span className="font-medium">Supported types:</span> JPG, PNG, GIF, WEBP
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={handleBackClick}
                className="px-6 py-2 rounded-lg border bg-white hover:bg-gray-100 text-gray-700 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Processing..."
                  : leadId
                    ? "Update Lead"
                    : "Save Lead"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ReassignmentModal
        isOpen={reassignmentModalOpen}
        onClose={() => setReassignmentModalOpen(false)}
        onConfirm={handleReassignmentConfirm}
        hasTasks={reassignmentCheckData?.hasActiveTasks}
        hasTargets={reassignmentCheckData?.hasActiveTargets}
        itemType="lead"
      />

      <ToastContainer position="top-right" autoClose={3000} theme="light" />
    </>
  );
}