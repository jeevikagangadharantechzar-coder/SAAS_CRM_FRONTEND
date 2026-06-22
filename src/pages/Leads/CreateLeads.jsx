import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

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
  const [isAutoAssigned, setIsAutoAssigned] = useState(false);
  const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const [formData, setFormData] = useState({
    leadName: "",
    phoneNumber: "",
    email: "",
    source: "",
    companyName: "",
    industry: "",
    requirement: "",
    status: "Cold",
    assignTo: "",
    address: "",
    country: "",
    followUpDate: "",
    notes: "",
    clientType: "",
    attachments: [],
  });

  const [errors, setErrors] = useState({});
  const [salesUsers, setSalesUsers] = useState([]);
  const [countries] = useState(getNames());
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState("in");

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

  //  Prefill from Website Contact Form (CREATE MODE ONLY)
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
      country: contactFormData.country || "",
      industry: contactFormData.industry || "",
      clientType: contactFormData.clientType || "",
      notes: contactFormData.notes || "",
    }));
    setExistingAttachments(contactFormData.attachments || []);
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

          setExistingAttachments(leadData.attachments || []);
          setFormData({
            leadName: leadData.leadName || "",
            companyName: leadData.companyName || "",
            phoneNumber: leadData.phoneNumber || "",
            email: leadData.email || "",
            source: leadData.source || "",
            industry: leadData.industry || "",
            clientType: leadData.clientType || "",
            requirement: leadData.requirement || "",
            status: leadData.status || "Cold",
            assignTo: leadData.assignTo?._id || "",
            address: leadData.address || "",
            country: leadData.country || "",
            followUpDate: leadData.followUpDate
              ? new Date(leadData.followUpDate).toISOString().split("T")[0]
              : "",
            notes: leadData.notes || "",
            attachments: [],
          });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));

    if (name === "assignTo") {
      setIsAutoAssigned(true);
    }

    if (errors[name]) {
      setErrors((p) => ({ ...p, [name]: false }));
    }
    if (fieldErrors[name]) {
      setFieldErrors((p) => ({ ...p, [name]: "" }));
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
      toast.error("Only PDF, Image, Word, Excel files are allowed");
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

    if (!formData.email.trim()) {
      newErrors.email = true;
      newFieldErrors.email = "Email is required";
    } else if (!validateEmailDomain(formData.email)) {
      newErrors.email = true;
      newFieldErrors.email =
        "Please enter a valid email address with a proper domain (e.g., name@company.com)";
    }

    setErrors(newErrors);
    setFieldErrors(newFieldErrors);

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

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const dataToSend = new FormData();

      for (let key in formData) {
        if (key === "attachments") {
          formData.attachments.forEach((file) =>
            dataToSend.append("attachments", file)
          );
        } else {
          dataToSend.append(key, formData[key]);
        }
      }

      dataToSend.append(
        "existingAttachments",
        JSON.stringify(existingAttachments)
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

  const handleBackClick = () => navigate(-1);

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
        { name: "email", label: "Email", icon: <Mail size={16} /> },
        { name: "address", label: "Address", icon: <MapPin size={16} /> },
        {
          name: "country",
          label: "Country",
          icon: <Globe size={16} />,
          type: "select",
          options: countries,
        },
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
            "IT",
            "Finance",
            "Healthcare",
            "Education",
            "Manufacturing",
            "Retail",
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
        {
          name: "assignTo",
          label: "Assign To",
          icon: <User size={16} />,
          type: "select",
          options: getSalesUsersOptions(),
        },
        {
          name: "followUpDate",
          label: "Follow-up Date",
          icon: <Calendar size={16} />,
          type: "date",
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
            {fieldGroups.map((group) => (
              <div
                key={group.title}
                className="space-y-6 p-6 border border-gray-200 rounded-xl shadow-sm"
              >
                <h2
                  className={`text-lg font-semibold border-b pb-2 ${group.color}`}
                >
                  {group.title}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {group.fields.map((field) => (
                    <div
                      key={field.name}
                      className={`${field.type === "textarea" ? "md:col-span-3" : ""}`}
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        {field.icon} {field.label}
                        {(field.name === "leadName" || field.name === "companyName" || field.name === "phoneNumber" || field.name === "email") && (
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
                        </div>
                      ) : field.type === "select" ? (
                        <div>
                          <select
                            name={field.name}
                            value={formData[field.name] || ""}
                            onChange={handleChange}
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
                      ) : (
                        <div>
                          <input
                            type={field.type || "text"}
                            name={field.name}
                            value={formData[field.name] || ""}
                            onChange={handleChange}
                            placeholder={`Enter ${field.label}`}
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Attachments Section */}
            <div className="space-y-6 p-6 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold border-b pb-2 text-indigo-600 flex items-center gap-2">
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
                          className="text-[12px] text-red-600 hover:underline mt-1"
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
                        <p className="text-[10px] text-gray-700 truncate w-full text-center">
                          {file.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx, "new");
                          }}
                          className="text-[12px] text-red-600 hover:underline mt-1"
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
                    <span className="font-medium">Supported types:</span>  PDF, JPG, PNG, Word, Excel
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

      <ToastContainer position="top-right" autoClose={3000} theme="light" />
    </>
  );
}