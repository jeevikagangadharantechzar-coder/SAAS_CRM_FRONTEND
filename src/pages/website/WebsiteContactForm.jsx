import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
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
  StickyNote,
} from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "react-toastify/dist/ReactToastify.css";

const WebsiteContactForm = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [countries] = useState(getNames());
  const [captchaToken, setCaptchaToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    leadName: "",
    phoneNumber: "",
    email: "",
    source: "Website",
    companyName: "",
    industry: "",
    requirement: "",
    address: "",
    country: "",
    notes: "",
    attachments: [],
    clientType: "",
  });

  const [errors, setErrors] = useState({});

  // ========== NEW: Blocked file types ==========
  const BLOCKED_EXTENSIONS = ['.js', '.exe', '.bat', '.sh', '.cmd', '.vbs', '.ps1', '.jar', '.wsf', '.scr', '.dll', '.msi'];

  const isFileAllowed = (file) => {
    const fileName = file.name.toLowerCase();
    return !BLOCKED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  };

  const getBlockedFilesList = (files) => {
    return files.filter(file => !isFileAllowed(file));
  };
  // =============================================

  // ========== NEW: Email validation function ==========
  const validateEmail = (email) => {
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    // Check if domain has valid structure
    const domain = email.split("@")[1];
    if (!domain) return false;

    // Domain should have at least one dot and valid characters
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };
  // ===================================================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (value.trim() !== "") setErrors((p) => ({ ...p, [name]: false }));
  };

  // ========== UPDATED: File change handler with validation ==========
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    // Check file size (existing validation)
    const oversized = files.filter((file) => file.size > 20 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error("Max file size is 20MB");
      return;
    }

    // Check file count (existing validation)
    if (files.length > 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    // ========== NEW: Check for blocked file types ==========
    const blockedFiles = getBlockedFilesList(files);
    
    if (blockedFiles.length > 0) {
      const blockedNames = blockedFiles.map(f => f.name).join(', ');
      toast.error(
        `Security Error: The following files cannot be uploaded for security reasons: ${blockedNames}. Please upload PDF, DOCX, JPG, PNG, or TXT files only.`,
        { autoClose: 8000 }
      );
      
      // Only add allowed files (if any)
      const allowedFiles = files.filter(file => isFileAllowed(file));
      
      if (allowedFiles.length > 0) {
        setFormData((p) => ({
          ...p,
          attachments: [...p.attachments, ...allowedFiles],
        }));
        toast.info(`Added ${allowedFiles.length} allowed file(s). Blocked files were ignored.`);
      }
      
      // Reset the file input to allow reselection
      e.target.value = null;
      return;
    }
    // =======================================================

    // If all files are allowed, proceed normally
    setFormData((p) => ({
      ...p,
      attachments: files,
    }));
  };
  // =========================================================

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!captchaToken) {
      toast.error("Please complete the captcha verification");
      return;
    }
    
    // ========== NEW: Validate attachments before submission ==========
    if (formData.attachments.length > 0) {
      const blockedFiles = getBlockedFilesList(formData.attachments);
      if (blockedFiles.length > 0) {
        const blockedNames = blockedFiles.map(f => f.name).join(', ');
        toast.error(
          `Cannot submit: The following files are blocked for security reasons: ${blockedNames}. Please remove them and try again.`,
          { autoClose: 8000 }
        );
        setIsSubmitting(false);
        return;
      }
    }
    // ================================================================

    setIsSubmitting(true);

    // ========== UPDATED: Validate email format ==========
    const newErrors = {
      leadName: !formData.leadName.trim(),
      companyName: !formData.companyName.trim(),
      phoneNumber: !formData.phoneNumber.trim(),
      email: !formData.email.trim() || !validateEmail(formData.email),
      clientType: !formData.clientType,
    };
    // ====================================================

    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      // ========== NEW: Show specific email error message ==========
      if (!formData.email.trim()) {
        toast.error("Email is required");
      } else if (formData.email.trim() && !validateEmail(formData.email)) {
        toast.error("Please enter a valid email address (e.g., name@company.com)");
      } else {
        toast.error("Please fill all required fields");
      }
      // ============================================================
      setIsSubmitting(false);
      return;
    }
    console.log("Submitting to:", `${API_URL}/public/contact-form`);
    console.log("FORM DATA BEING SENT ", formData);

    try {
      const dataToSend = new FormData();

      dataToSend.append("name", formData.leadName);
      dataToSend.append("phone", formData.phoneNumber);
      dataToSend.append("email", formData.email);
      dataToSend.append("source", formData.source);
      dataToSend.append("companyName", formData.companyName);
      dataToSend.append("industry", formData.industry);
      dataToSend.append("address", formData.address);
      dataToSend.append("country", formData.country);
      dataToSend.append("clientType", formData.clientType); 
      dataToSend.append("requirement", formData.requirement);
      dataToSend.append("notes", formData.notes);
      dataToSend.append("captchaToken", captchaToken);
      formData.attachments.forEach((file) => {
        dataToSend.append("attachments", file);
      });

      await axios.post(
        `${API_URL}/public/contact-form`,
        dataToSend,
      );
      toast.dismiss();

      toast.success("Thank you! We will contact you shortly.");
      setCaptchaToken(null);
      setFormData({
        leadName: "",
        phoneNumber: "",
        email: "",
        source: "Website",
        companyName: "",
        industry: "",
        requirement: "",
        address: "",
        country: "",
        notes: "",
        attachments: [],
        clientType: "",  
      });

    } catch (err) {
      toast.dismiss();
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldGroups = [
    {
      title: "Basic Information",
      color: "text-blue-600",
      fields: [
        { name: "leadName", label: "Your Name", icon: <User size={16} /> },
        { name: "companyName", label: "Company Name", icon: <Building2 size={16} /> },
        { name: "phoneNumber", label: "Phone Number", icon: <Phone size={16} /> },
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
          options: ["IT", "Finance", "Healthcare", "Education", "Manufacturing", "Retail", "Other"],
        },
        { name: "requirement", label: "Requirement", icon: <FileText size={16} /> },
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

  return (
    <>
      <div className="min-h-screen flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border">
          <div className="px-6 py-5 border-b">
            <h1 className="text-2xl font-bold text-gray-800">Contact Us</h1>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {fieldGroups.map((group) => (
              <div key={group.title} className="space-y-6 p-6 border rounded-xl">
                <h2 className={`text-lg font-semibold border-b pb-2 ${group.color}`}>
                  {group.title}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {group.fields.map((field) => (
                    <div key={field.name} className={field.type === "textarea" ? "md:col-span-3" : ""}>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        {field.icon} {field.label}
                        {(field.name === "leadName" ||
                          field.name === "companyName" ||
                          field.name === "phoneNumber" ||
                          field.name === "email") && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>

                      {field.name === "phoneNumber" ? (
                      <div>
                        <div className={`border rounded-lg ${errors.phoneNumber ? "border-red-500" : "border-gray-300"}`}>
                          <PhoneInput
                            country="in"
                            value={formData.phoneNumber}
                            onChange={(phone) =>
                              setFormData((p) => ({ ...p, phoneNumber: phone }))
                            }
                            specialLabel=""
                            inputStyle={{
                              width: "100%",
                              height: "42px",
                              fontSize: "14px",
                              paddingLeft: "55px",
                              borderRadius: "0.5rem",
                              boxSizing: "border-box",
                              border: "none",
                            }}
                            buttonStyle={{
                              borderRadius: "0.5rem 0 0 0.5rem",
                              height: "42px",
                              background: "white",
                              border: "none",
                              borderRight: "1px solid #e5e7eb",
                            }}
                            containerStyle={{ width: "100%" }}
                            dropdownStyle={{ borderRadius: "0.5rem" }}
                          />
                        </div>
                        {errors.phoneNumber && (
                          <p className="text-sm text-red-500 mt-1">
                            Phone number is required
                          </p>
                        )}
                      </div>
                      ) : field.type === "select" ? (
                        <select
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-3 py-2 h-11"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "textarea" ? (
                        <textarea
                          name={field.name}
                          rows={5}
                          value={formData[field.name]}
                          onChange={handleChange}
                          className="w-full border rounded-xl px-4 py-3"
                        />
                      ) : (
                        <input
                          type="text"
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleChange}
                          className={`w-full border rounded-lg px-3 py-2 h-11 ${errors.email && field.name === "email" ? "border-red-500" : "border-gray-300"}`}
                        />
                      )}

                      {errors[field.name] && field.name !== "email" && (
                        <p className="text-sm text-red-500 mt-1">
                          {field.label} is required
                        </p>
                      )}
                      
                      {/* ========== NEW: Email error message ========== */}
                      {field.name === "email" && errors.email && (
                        <p className="text-sm text-red-500 mt-1">
                          {!formData.email.trim() ? "Email is required" : "Please enter a valid email address (e.g., name@company.com)"}
                        </p>
                      )}
                      {/* ============================================= */}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/*  ATTACHMENTS SECTION - ADD HERE */}
            <div className="space-y-6 p-6 border rounded-xl">
              <h2 className="text-lg font-semibold border-b pb-2 text-orange-600">
                Attachments
              </h2>

              <div>
                <label
                  htmlFor="attachments"
                  className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition p-6"
                >
                  {formData.attachments.length === 0 ? (
                    <div className="text-center">
                      <span className="text-sm text-gray-600">
                        Click or drag files here (Max file length 20MB)
                      </span>
                      
                      
                    </div>
                  ) : (
                    <div className="w-full flex flex-wrap gap-4">
                      {formData.attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="relative flex flex-col items-center w-28 h-28 bg-white border rounded-xl p-2"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault(); // prevents file dialog from opening
                              const updatedFiles = formData.attachments.filter(
                                (_, index) => index !== idx
                              );
                              setFormData({ 
                                ...formData,
                                attachments: updatedFiles,
                              });
                            }}
                            className="absolute top-1 right-1 text-red-500 text-xs"
                          >
                            ✕
                          </button>
                          <p className="text-xs truncate w-full text-center">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
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
            <div className="mt-4">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
              />
            </div>

            <div className="flex justify-end pt-6 border-t">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
export default WebsiteContactForm;