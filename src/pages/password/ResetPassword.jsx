import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";
  const { token, tenantSlug } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

/* ── Check Password Strength Function ─────────────────────── */
  const checkPasswordStrength = (value) => {
    let strength = 0;
    if (value.length >= 8) strength += 1;
    if (/[A-Z]/.test(value)) strength += 1;
    if (/[0-9]/.test(value)) strength += 1;
    if (/[^A-Za-z0-9]/.test(value)) strength += 1;
    return strength;
  };

/* ── Handle Password Change Function ─────────────────────── */
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
  };

/* ── Handle Reset Function ─────────────────────── */
const handleReset = async (e) => {
  e.preventDefault();

  if (password !== confirmPassword) {
    setMessage("Passwords do not match");
    setIsError(true);
    return;
  }

  setIsLoading(true);

  try {
    const requestUrl = tenantSlug
      ? `${SI_URI}/${tenantSlug}/api/users/reset-password/${token}`
      : `${API_URL}/users/reset-password/${token}`;

    const res = await axios.post(
      requestUrl,
      { password }
    );

    setMessage("Password reset successful! Redirecting to login...");
    setIsError(false);

    // redirect after 2 seconds
    setTimeout(() => {
      if (tenantSlug) {
        navigate(`/${tenantSlug}/login`, { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }, 2000);

  } catch (error) {

    setMessage(
      error.response?.data?.message ||
      "Error resetting password. The link may have expired."
    );

    setIsError(true);

  } finally {
    setIsLoading(false);
  }
};

/* ── Get Password Strength Text Function ─────────────────────── */
  const getPasswordStrengthText = () => {
    const strengthText = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
    return password ? strengthText[passwordStrength] : "";
  };

/* ── Get Password Strength Color Function ─────────────────────── */
  const getPasswordStrengthColor = () => {
    const colors = ["text-red-500", "text-orange-500", "text-yellow-500", "text-green-500", "text-green-600"];
    return colors[passwordStrength];
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        {/* Logo Section */}
        <div className="flex justify-center mb-6">
          <img 
            src="/images/TZI_Logo-04_-_Copy-removebg-preview.png" 
            alt="TZI Logo" 
            className="h-16 object-contain"
          />
        </div>
        
        <button 
          onClick={() => {
            if (tenantSlug) {
              navigate(`/${tenantSlug}/login`);
            } else {
              navigate("/login");
            }
          }}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-2 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Login
        </button>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Reset Your Password</h2>
        <p className="text-gray-600 mb-6">Enter your new password below</p>
        
        {message && (
          <div className={`p-3 rounded-lg mb-5 flex items-start gap-2 ${isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {isError ? (
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            )}
            <span>{message}</span>
          </div>
        )}
        
        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                value={password}
                onChange={handlePasswordChange}
                required
                minLength={6}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            
            {password && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Password strength:</span>
                  <span className={`text-xs font-medium ${getPasswordStrengthColor()}`}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      passwordStrength === 0 ? "bg-red-500" :
                      passwordStrength === 1 ? "bg-orange-500" :
                      passwordStrength === 2 ? "bg-yellow-500" :
                      passwordStrength === 3 ? "bg-green-500" : "bg-green-600"
                    }`}
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            
         {/* password */}
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
            
            {confirmPassword && password === confirmPassword && (
              <p className="mt-1 text-xs text-green-500 flex items-center">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Passwords match
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading || password !== confirmPassword}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition flex items-center justify-center
              ${isLoading || password !== confirmPassword
                ? "bg-blue-400 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
        
        <div className="mt-6 pt-5 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Make sure your new password is strong and unique. We recommend using at least 8 characters with a mix of letters, numbers, and symbols.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;