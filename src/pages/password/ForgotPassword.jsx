import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Loader2, Mail, ArrowLeft, CheckCircle2, AlertCircle, Building2 } from "lucide-react";

/* ── Forgot Password Component ─────────────────────── */

const ForgotPassword = ({ isOpen, onClose }) => {
  const { tenantSlug } = useParams();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";

  const [email, setEmail] = useState("");
  const [tenantInputSlug, setTenantInputSlug] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (tenantSlug) {
      setTenantInputSlug(tenantSlug);
    } else {
      setTenantInputSlug("");
    }
  }, [tenantSlug, isOpen]);

/* ── Handle Forgot Password Function ─────────────────────── */
  const handleForgot = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsError(false);
    
    try {
      const targetSlug = tenantInputSlug.trim();
      const requestUrl = targetSlug
        ? `${SI_URI}/${targetSlug}/api/users/forgot-password`
        : `${API_URL}/users/forgot-password`;

      const res = await axios.post(requestUrl, { email });
      setMessage(res.data.message);
      setIsError(false);
      setIsSuccess(true);
    } catch (error) {
      setMessage(error.response?.data?.message || "Error sending reset link. Please try again.");
      setIsError(true);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

/* ── Handle Close Function ─────────────────────── */
  const handleClose = () => {
    setEmail("");
    setMessage("");
    setIsError(false);
    setIsSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                {isSuccess ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Check Your Email
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 text-blue-500" />
                    Forgot Password
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {!isSuccess ? (
              <>
                <p className="text-gray-600 mb-6">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                
                <form onSubmit={handleForgot} className="space-y-4">
                  {message && (
                    <div className={`p-3 rounded-md flex items-start gap-2 ${isError ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{message}</span>
                    </div>
                  )}
                  
                  {/* Tenant Slug Input */}
                  <div className="space-y-2">
                    <label htmlFor="tenantSlug" className="text-sm font-medium text-gray-700">
                      Tenant Portal / Company Identifier
                    </label>
                    <div className="relative">
                      <input
                        id="tenantSlug"
                        type="text"
                        placeholder="e.g. my-company"
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                        value={tenantInputSlug}
                        onChange={(e) => setTenantInputSlug(e.target.value)}
                        required
                        disabled={!!tenantSlug}
                      />
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    {tenantSlug && (
                      <p className="text-xs text-blue-600 font-medium">
                        Locked to your current tenant portal: {tenantSlug}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
                <p className="text-gray-600 mb-6">
                  We've sent a password reset link to <span className="font-medium">{email}</span>. 
                  Please check your inbox and follow the instructions.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <button
                  onClick={() => {
                    setMessage("");
                    setIsSuccess(false);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to reset
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t">
            <p className="text-xs text-gray-500 text-center">
              Remember your password?{" "}
              <button
                onClick={handleClose}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Back to login
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPassword;