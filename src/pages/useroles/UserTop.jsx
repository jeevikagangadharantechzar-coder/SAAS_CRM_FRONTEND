import React from "react";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import toast, { Toaster } from "react-hot-toast";
import { Eye, EyeOff, X } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

export default function AddUserModal({ onUserCreated, disabled, users = [] }) {
  const API_URL = import.meta.env.VITE_API_URL;
  const API_SI  = import.meta.env.VITE_SI_URI;

  const [isDialogOpen,       setIsDialogOpen]       = useState(false);
  const [formData,           setFormData]           = useState({
    firstName: "", lastName: "", gender: "", dateOfBirth: "",
    mobileNumber: "", email: "", password: "", confirmPassword: "",
    address: "", role: "", status: "Active", profileImage: null,
  });
  const [previewUrl,         setPreviewUrl]         = useState(null);
  const [roles,              setRoles]              = useState([]);
  const [errors,             setErrors]             = useState({});
  const [showPassword,       setShowPassword]       = useState(false);
  const [showConfirmPassword,setShowConfirmPassword]= useState(false);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [phoneCountryCode,   setPhoneCountryCode]   = useState("in");

  const formRef      = useRef(null);
  const fileInputRef = useRef(null);

  //  Phone validation function
  const validatePhoneNumber = (phone, countryCode = "in") => {
    if (!phone) return false;
    
    // Remove all non-digit characters
    const digits = String(phone).replace(/\D/g, "");
    
    // For Indian numbers - strict validation
    if (countryCode === "in") {
      // 10 digits starting with 6-9
      if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return true;
      // 11 digits starting with 0
      if (digits.length === 11 && digits.startsWith("0") && /^0[6-9]\d{9}$/.test(digits)) return true;
      // 12 digits starting with 91
      if (digits.length === 12 && digits.startsWith("91") && /^91[6-9]\d{9}$/.test(digits)) return true;
      return false;
    }
    
    // For other countries, basic length validation
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

  // ── Profile image URL helper ──────────────────────────────────────────────
  const getProfileImageUrl = (image) => {
    if (!image) return "https://static.vecteezy.com/system/resources/previews/020/429/953/non_2x/admin-icon-vector.jpg";
    if (image.startsWith("blob:") || image.startsWith("http")) return image;
    return `${API_SI}/uploads/users/${image}`;
  };

  // ── Reset form ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      firstName: "", lastName: "", gender: "", dateOfBirth: "",
      mobileNumber: "", email: "", password: "", confirmPassword: "",
      address: "", role: "", status: "Active", profileImage: null,
    });
    setPreviewUrl(getProfileImageUrl(null));
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPhoneCountryCode("in");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (open) => {
    setIsDialogOpen(open);
    if (!open) resetForm();
  };

  const handleCancel = () => { resetForm(); setIsDialogOpen(false); };

  // ── Phone input CSS fix ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isDialogOpen) return;
    const style = document.createElement("style");
    style.id = "phone-input-fix";
    style.textContent = `
      .PhoneInput { width: 100%; }
      .PhoneInputInput {
        width: 100%; padding: 10px; border-radius: 8px;
        border: 1px solid #d1d5db; font-size: 14px; outline: none; transition: all 0.2s;
      }
      .PhoneInputInput:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
      .PhoneInputCountry { padding: 0 12px 0 8px; }
      .PhoneInputCountrySelect {
        position: absolute; top: 0; left: 0; height: 100%; width: 100%;
        z-index: 1; border: 0; opacity: 0; cursor: pointer;
      }
      .PhoneInputCountryIcon { width: 24px; height: 18px; box-shadow: 0 0 1px rgba(0,0,0,0.5); }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("phone-input-fix")?.remove();
  }, [isDialogOpen]);

  useEffect(() => {
    if (!previewUrl) setPreviewUrl(getProfileImageUrl(null));
  }, []);

  // ── Field handlers ────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent typing spaces in password fields
    if ((name === "password" || name === "confirmPassword") && /\s/.test(value)) {
      return;
    }

    // Restrict manual year entry to 4 digits in Date of Birth
    if (name === "dateOfBirth" && value) {
      const parts = value.split("-");
      if (parts[0] && parts[0].length > 4) {
        parts[0] = parts[0].substring(0, 4);
        const newValue = parts.join("-");
        setFormData((prev) => ({ ...prev, [name]: newValue }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "password" || name === "confirmPassword") {
      const updated = { ...formData, [name]: value };
      if (updated.password && updated.confirmPassword && updated.password !== updated.confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      }
    }
  };

  //  Fixed phone change handler
  const handlePhoneChange = (value, countryData) => {
    setFormData((prev) => ({ ...prev, mobileNumber: value }));
    setPhoneCountryCode(countryData?.countryCode || "in");
    
    if (errors.mobileNumber) {
      setErrors((prev) => ({ ...prev, mobileNumber: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ["image/jpeg","image/jpg","image/png","image/gif","image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPEG, JPG, PNG, GIF and WebP files are allowed");
      setErrors((prev) => ({ ...prev, profileImage: "Only JPEG, JPG, PNG, GIF and WebP files are allowed" }));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB");
      setErrors((prev) => ({ ...prev, profileImage: "File size must be less than 20MB" }));
      return;
    }
    setFormData((prev) => ({ ...prev, profileImage: file }));
    setPreviewUrl(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, profileImage: "" }));
  };

  const removeProfileImage = () => {
    setFormData((prev) => ({ ...prev, profileImage: null }));
    setPreviewUrl(getProfileImageUrl(null));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim())  newErrors.firstName = "First name is required";
    if (!formData.lastName.trim())   newErrors.lastName  = "Last name is required";
    
    //  Email validation
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";
    
    //  Phone validation - FIXED
    if (!formData.mobileNumber) {
      newErrors.mobileNumber = "Phone number is required";
    } else if (!validatePhoneNumber(formData.mobileNumber, phoneCountryCode)) {
      newErrors.mobileNumber = `Please enter a valid phone number (${getPhoneNumberLengthMessage(phoneCountryCode)})`;
    } else {
      const digits = formData.mobileNumber.replace(/\D/g, "");
      const isDuplicatePhone = users.some(
        (u) => u.mobileNumber?.replace(/\D/g, "") === digits
      );
      if (isDuplicatePhone) {
        newErrors.mobileNumber = "This phone number is already in use by another user";
      }
    }
    
    // Date of Birth validation
    if (formData.dateOfBirth) {
      const parts = formData.dateOfBirth.split("-");
      if (parts[0]) {
        if (parts[0].length > 4) {
          newErrors.dateOfBirth = "Year cannot exceed 4 digits";
        } else {
          const birthYear = parseInt(parts[0], 10);
          const currentYear = new Date().getFullYear();
          if (birthYear > currentYear) {
            newErrors.dateOfBirth = "Year cannot be in the future";
          } else if (birthYear < 1900) {
            newErrors.dateOfBirth = "Year cannot be before 1900";
          }
        }
      }
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (/\s/.test(formData.password)) {
      newErrors.password = "Password cannot contain spaces";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain uppercase, lowercase and numbers";
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (/\s/.test(formData.confirmPassword)) {
      newErrors.confirmPassword = "Confirm password cannot contain spaces";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    if (!formData.role)   newErrors.role   = "Role is required";
    if (!formData.gender) newErrors.gender = "Gender is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0 && formRef.current) {
      setTimeout(() => {
        const firstErr = formRef.current.querySelector(".border-red-500");
        if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
        else formRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!validateForm()) {
      toast.error("Please fill all required fields correctly");
      setIsSubmitting(false);
      return;
    }

    const submitPromise = async () => {
      const payload = new FormData();
      payload.append("firstName",       formData.firstName);
      payload.append("lastName",        formData.lastName);
      payload.append("gender",          formData.gender);
      payload.append("dateOfBirth",     formData.dateOfBirth);
      payload.append("mobileNumber",    formData.mobileNumber);
      payload.append("email",           formData.email);
      payload.append("password",        formData.password);
      payload.append("confirmPassword", formData.confirmPassword);
      payload.append("address",         formData.address);
      payload.append("role",            formData.role);
      payload.append("status",          formData.status);
      if (formData.profileImage) payload.append("profileImage", formData.profileImage);

      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/users/create`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        transformRequest: (data, headers) => { delete headers["Content-Type"]; return data; },
      });

      if (onUserCreated) await onUserCreated();
      resetForm();
      setIsDialogOpen(false);
    };

    try {
      await toast.promise(submitPromise(), {
        loading: "Creating user...",
        success: "User created successfully!",
        error:   (err) => err.response?.data?.message || "Failed to create user",
      });
    } catch (err) {
      const message = err.response?.data?.message?.toLowerCase() || "";

      if (message.includes("email") && message.includes("already")) {
        setErrors((prev) => ({ ...prev, email: "Email already exists" }));
        if (formRef.current) {
          setTimeout(() => {
            const emailErr = formRef.current.querySelector('input[name="email"]');
            emailErr?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        }
      } else if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }

      const isLimitErr = err.response?.data?.limitExceeded;
      if (isLimitErr) {
        toast((t) => (
          <div className="flex flex-col space-y-2">
            <span className="font-semibold text-red-700">{err.response.data.message}</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                const slug = window.location.pathname.split("/")[1];
                window.location.href = `/${slug}/upgrade`;
              }}
              className="px-3 py-1.5 bg-[#008ECC] text-white rounded font-bold text-xs hover:bg-blue-700 transition cursor-pointer self-start"
            >
              Upgrade Plan
            </button>
          </div>
        ), { duration: 8000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Fetch roles ───────────────────────────────────────────────────────────
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${API_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(Array.isArray(data) ? data : data.roles || []);
    } catch (err) {
      console.error("Failed to fetch roles", err);
      toast.error("Failed to load roles. Please try again.");
    }
  };

  useEffect(() => { if (isDialogOpen) fetchRoles(); }, [isDialogOpen]);

  useEffect(() => {
    return () => { if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // ── Error icon helper ─────────────────────────────────────────────────────
  const ErrorIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd" />
    </svg>
  );

  return (
    <div>
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
          },
          success: {
            style: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
            iconTheme: { primary: "#22c55e", secondary: "#f0fdf4" },
          },
          error: {
            style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
            iconTheme: { primary: "#ef4444", secondary: "#fef2f2" },
          },
          loading: {
            style: { background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" },
          },
        }}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <button
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add User
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0" style={{ zIndex: 50 }}>
          <DialogHeader className="px-6 pt-6 pb-0">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold text-gray-800">Add New User</DialogTitle>
            </div>
          </DialogHeader>

          {/* Profile Photo Upload */}
          <div className="flex justify-center py-6 px-6">
            <div className="relative w-32 h-32">
              <div className="w-full h-full overflow-hidden rounded-full border-4 border-white shadow-lg">
                <img
                  src={previewUrl}
                  alt="Profile Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://static.vecteezy.com/system/resources/previews/020/429/953/non_2x/admin-icon-vector.jpg";
                  }}
                />
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 p-2.5 rounded-full cursor-pointer shadow-lg transition-all duration-200 transform hover:scale-105">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="profileImage"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="white">
                  <path d="M480-264q72 0 120-49t48-119q0-69-48-118.5T480-600q-72 0-120 49.5T312-432q0 69.5 48 118.5t120 49Zm0-72q-42 0-69-28.13T384-433q0-39.9 27-67.45Q438-528 480-528t69 27.55q27 27.55 27 67.45 0 40.74-27 68.87Q522-336 480-336ZM168-144q-29 0-50.5-21.5T96-216v-432q0-29 21.5-50.5T168-720h120l72-96h240l72 96h120q29.7 0 50.85 21.5Q864-677 864-648v432q0 29-21.15 50.5T792-144H168Zm0-72h624v-432H636l-72.1-96H396l-72 96H168v432Zm312-217Z" />
                </svg>
              </label>
              {formData.profileImage && (
                <button
                  type="button"
                  onClick={removeProfileImage}
                  className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 p-1.5 rounded-full cursor-pointer shadow-lg transition-all duration-200"
                  aria-label="Remove profile image"
                >
                  <X size={14} className="text-white" />
                </button>
              )}
            </div>
          </div>

          {errors.profileImage && (
            <div className="px-6 -mt-4">
              <p className="text-red-500 text-sm text-center bg-red-50 py-1.5 px-3 rounded-md inline-block">
                {errors.profileImage}
              </p>
            </div>
          )}

          {/* Form */}
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6"
          >
            {/* First Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text" name="firstName" placeholder="Enter first name"
                value={formData.firstName} onChange={handleChange}
                className={`p-2.5 border rounded-lg w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.firstName ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                }`}
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <ErrorIcon />{errors.firstName}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text" name="lastName" placeholder="Enter last name"
                value={formData.lastName} onChange={handleChange}
                className={`p-2.5 border rounded-lg w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.lastName ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                }`}
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <ErrorIcon />{errors.lastName}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender" value={formData.gender} onChange={handleChange}
                className={`p-2.5 border rounded-lg w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.gender ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <ErrorIcon />{errors.gender}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date of Birth</label>
              <input
                type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange}
                className={`p-2.5 border rounded-lg w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.dateOfBirth ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                }`}
              />
              {errors.dateOfBirth && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <ErrorIcon />{errors.dateOfBirth}
                </p>
              )}
            </div>

            {/* Mobile Number - FIXED */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className={`border rounded-lg transition-all duration-200 ${
                errors.mobileNumber ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
              }`}>
                <PhoneInput
                  country="in"
                  value={formData.mobileNumber}
                  onChange={handlePhoneChange}
                  inputStyle={{
                    width: "100%",
                    height: "42px",
                    fontSize: "14px",
                    paddingLeft: "55px",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: "transparent"
                  }}
                  buttonStyle={{
                    borderRadius: "0.5rem 0 0 0.5rem",
                    height: "42px",
                    background: "white",
                    border: "none",
                    borderRight: "1px solid #e5e7eb",
                  }}
                  containerStyle={{ width: "100%" }}
                />
              </div>
              {errors.mobileNumber && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <ErrorIcon />{errors.mobileNumber}
                </p>
              )}
              {formData.mobileNumber && !errors.mobileNumber && validatePhoneNumber(formData.mobileNumber, phoneCountryCode) && (
                <p className="text-green-600 text-xs mt-1.5">
                  ✓ Valid phone number
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email" name="email" placeholder="Enter email address"
                value={formData.email} onChange={handleChange}
                className={`p-2.5 border rounded-lg w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <ErrorIcon />{errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password" placeholder="Enter password"
                  value={formData.password} onChange={handleChange}
                  className={`p-2.5 border rounded-lg w-full pr-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <ErrorIcon />{errors.password}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1.5">
                Minimum 8 characters with uppercase, lowercase and numbers
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword" placeholder="Confirm password"
                  value={formData.confirmPassword} onChange={handleChange}
                  className={`p-2.5 border rounded-lg w-full pr-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.confirmPassword ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <ErrorIcon />{errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
              <textarea
                name="address" placeholder="Enter address"
                value={formData.address} onChange={handleChange}
                className="p-2.5 border border-gray-300 rounded-lg w-full transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="3"
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role" value={formData.role} onChange={handleChange}
                className={`p-2.5 border rounded-lg w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.role ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <option value="">Select Role</option>
                {roles.length === 0
                  ? <option disabled>Loading roles...</option>
                  : roles.map((role) => (
                      <option key={role._id} value={role._id}>{role.name}</option>
                    ))
                }
              </select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <ErrorIcon />{errors.role}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <select
                name="status" value={formData.status} onChange={handleChange}
                className="p-2.5 border border-gray-300 rounded-lg w-full transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 border-t pt-4 sm:col-span-2">
              <button
                type="button" onClick={handleCancel} disabled={isSubmitting}
                className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : "Submit"}
              </button>
            </div>

            {/* Required note */}
            <div className="sm:col-span-2 text-xs text-gray-500 pt-2">
              <p className="flex items-center gap-1">
                <span className="text-red-500">*</span>
                <span>Required fields</span>
              </p>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}