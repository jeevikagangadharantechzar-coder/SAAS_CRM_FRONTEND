import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { setCredentials, clearCredentials } from "../../store/authSlice";
import { initSocket } from "../../utils/socket";
import ForgotPassword from "../password/ForgotPassword";

// Pure JavaScript JWT Decode Helper
const decodeToken = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT Decode Error:", e);
    return null;
  }
};

const Login = () => {
  const { tenantSlug } = useParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [showUpgradeButton, setShowUpgradeButton] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(null);


  const navigate = useNavigate();
  const dispatch = useDispatch();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";

  // Show a popup if we were just logged out because the plan/trial expired
  useEffect(() => {
    const raw = sessionStorage.getItem("authExpiredNotice");
    if (raw) {
      sessionStorage.removeItem("authExpiredNotice");
      try {
        setExpiredNotice(JSON.parse(raw));
      } catch {
        setExpiredNotice(null);
      }
    }
  }, []);

  // A token is only worth honoring/blocking on if it hasn't expired yet.
  // A dead token (expired, or left over from a deleted tenant) should never
  // be able to permanently lock the login page.
  const isTokenLive = (token) => {
    if (!token) return false;
    const decoded = decodeToken(token);
    return !!decoded?.exp && decoded.exp * 1000 > Date.now();
  };

  useEffect(() => {
    const evaluateSession = () => {
      const activeToken = localStorage.getItem("token");
      const activeSlug = localStorage.getItem("tenantSlug");

      if (activeToken && activeSlug && isTokenLive(activeToken)) {
        if (!tenantSlug || activeSlug === tenantSlug) {
          navigate(`/${activeSlug}/dashboard`, { replace: true });
        } else {
          setMessage(`Another tenant session (${activeSlug}) is already active. Please log out of that session first.`);
          setIsError(true);
        }
      } else {
        if (activeToken || activeSlug) dispatch(clearCredentials());
        setMessage("");
        setIsError(false);
      }
    };

    evaluateSession();

    window.addEventListener("storage", evaluateSession);
    return () => window.removeEventListener("storage", evaluateSession);
  }, [tenantSlug, navigate, dispatch]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setShowUpgradeButton(false);

    // 1. Check if another tenant is already logged in (ignore dead/expired tokens)
    const activeToken = localStorage.getItem("token");
    const activeSlug = localStorage.getItem("tenantSlug");
    if (activeToken && activeSlug && tenantSlug && activeSlug !== tenantSlug && isTokenLive(activeToken)) {
      setMessage(`Another tenant session (${activeSlug}) is already active. Please log out of that session first.`);
      setIsError(true);
      setIsLoading(false);
      return;
    }

    // 2. Clear stale credentials only when safe to proceed
    dispatch(clearCredentials());

    try {
      // 1. Post to login using a clean axios instance to bypass interceptors
      const cleanAxios = axios.create();
      const loginUrl = tenantSlug
        ? `${SI_URI}/${tenantSlug}/api/users/login`
        : `${API_URL}/users/login`;

      const response = await cleanAxios.post(loginUrl, {
        email,
        password,
      });

      if (response.data.token) {
        const token = response.data.token;
        
        // Decode token to verify parameters
        const decoded = decodeToken(token);
        const resolvedSlug = decoded?.slug;

        if (!resolvedSlug) {
          setMessage("Tenant slug missing from authentication response.");
          setIsError(true);
          setIsLoading(false);
          return;
        }

        // 2. Fetch full profile (role + permissions object) using cleanAxios
        const profileRes = await cleanAxios.get(`${SI_URI}/${resolvedSlug}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fullUser = profileRes.data;

        // 3. Connect real-time socket immediately
        initSocket(fullUser._id || fullUser.id);

        // 4. Update login streak leaderboard automatically using cleanAxios
        try {
          await cleanAxios.post(
            `${SI_URI}/${resolvedSlug}/api/streak/update/${fullUser._id || fullUser.id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (streakErr) {
          console.error("Streak tracker failed:", streakErr);
        }

        // 5. Store session to Redux and LocalStorage
        dispatch(
          setCredentials({
            token,
            slug: resolvedSlug,
            user: fullUser,
          })
        );

        if (response.data.isDbRefreshed) {
          localStorage.setItem("db_refreshed_toast", "true");
        }

        setMessage(response.data.message || "Logged in successfully!");
        setIsError(false);

        setTimeout(() => {
          navigate(`/${resolvedSlug}/dashboard`);
        }, 1500);
      } else {
        setMessage("Token missing in authentication response");
        setIsError(true);
      }
    } catch (error) {
      console.error("Login Error:", error);
      setMessage(error.response?.data?.message || "Authentication failed. Check details.");
      setIsError(true);
      if (error.response?.data?.planExpired) {
        setShowUpgradeButton(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="flex flex-col lg:flex-row w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Left Side - Image */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 items-center justify-center p-8">
          <div className="text-center">
            <img
              src="/images/TZI_Logo-04_-_Copy-removebg-preview.png"
              alt="TZI Logo"
              className="w-full max-w-xs mx-auto mb-6"
              onError={(e) => {
                e.target.src = "https://tzi.zaarapp.com//storage/uploads/logo//logo-dark.png";
              }}
            />
            <h2 className="text-2xl font-bold text-gray-800 mt-6">Welcome Back</h2>
            <p className="text-gray-600 mt-2">Sign in to access your tenant CRM portal</p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-12">
          {/* Mobile Logo */}
          <div className="mb-8 lg:hidden flex justify-center">
            <img
              src="/images/TZI_Logo-04_-_Copy-removebg-preview.png"
              alt="TZI Logo"
              className="w-32 h-auto"
              onError={(e) => {
                e.target.src = "https://tzi.zaarapp.com//storage/uploads/logo//logo-dark.png";
              }}
            />
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center lg:text-left">Sign In</h2>
          <p className="text-gray-600 mb-8 text-center lg:text-left">
            Enter your credentials to continue
          </p>

          {/* Message Display */}
          {message && (
            <div
              className={`rounded-lg p-4 mb-6 text-center shadow-sm flex flex-col items-center justify-center space-y-3 ${
                isError ? "bg-red-50 text-red-700 border border-red-150" : "bg-green-50 text-green-700 border border-green-150"
              }`}
            >
              <span className="font-semibold text-sm leading-relaxed">{message}</span>
              
              {isError && showUpgradeButton && (
                <button
                  type="button"
                  onClick={() => navigate(`/${tenantSlug}/upgrade`)}
                  className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition cursor-pointer shadow-sm hover:shadow-md mt-1 animate-pulse"
                >
                  Upgrade Plan Now
                </button>
              )}
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Show tenant slug input if not locked in route */}
            

            <div>
              <label className="block text-gray-700 font-medium mb-2">Email Address</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <Eye className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link only */}
            <div className="flex justify-end text-sm">
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="text-blue-600 hover:text-blue-800 font-medium transition cursor-pointer"
              >
                Forgot your password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: "#008ECC" }}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-gray-500 text-sm text-center">© 2025 TZI. All rights reserved.</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPassword isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />

      {/* Trial / Plan Expired Popup */}
      {expiredNotice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {expiredNotice.trialExpired ? "Your Free Trial Has Ended" : "Subscription Expired"}
            </h3>
            <p className="text-gray-600 mb-6">{expiredNotice.message}</p>
            <div className="flex flex-col gap-3">
              {expiredNotice.trialExpired && tenantSlug && (
                <button
                  type="button"
                  onClick={() => {
                    setExpiredNotice(null);
                    navigate(`/${tenantSlug}/upgrade`);
                  }}
                  className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90 transition"
                  style={{ backgroundColor: "#008ECC" }}
                >
                  Upgrade Plan Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpiredNotice(null)}
                className="w-full py-3 rounded-lg font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
