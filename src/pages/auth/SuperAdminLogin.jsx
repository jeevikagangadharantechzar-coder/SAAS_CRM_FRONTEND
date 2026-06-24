import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { setSuperAdminCredentials } from "../../store/authSlice";

const BASE_URL = import.meta.env.VITE_SI_URI || "http://localhost:5000";

const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await axios.post(`${BASE_URL}/superadmin/api/auth/login`, {
        email,
        password,
      });

      if (response.data && response.data.token) {
        dispatch(setSuperAdminCredentials({ token: response.data.token }));
        setMessage("Login successful! Redirecting...");
        setIsError(false);
        setTimeout(() => {
          navigate("/superadmin/dashboard");
        }, 1500);
      } else {
        setMessage(response.data.message || response.data.error || "Failed to log in as SuperAdmin");
        setIsError(true);
      }
    } catch (error) {
      console.error("SuperAdmin Login Error:", error);
      setMessage(
        error.response?.data?.message || error.response?.data?.error || "Login failed"
      );
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="flex flex-col lg:flex-row w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Left Side - Image/Info */}
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
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-800">SuperAdmin Portal</h2>
            <p className="text-gray-600 mt-3 max-w-xs mx-auto">
              Secure administrative gateway to manage tenants, view system metrics, and customize platform settings.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-12 bg-white">
          <div className="mb-6 lg:hidden flex justify-center">
            <img
              src="/images/TZI_Logo-04_-_Copy-removebg-preview.png"
              alt="TZI Logo"
              className="w-32 h-auto"
              onError={(e) => {
                e.target.src = "https://tzi.zaarapp.com//storage/uploads/logo//logo-dark.png";
              }}
            />
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center lg:text-left">Administration</h2>
          <p className="text-gray-600 mb-8 text-center lg:text-left">
            Authorized access only. Enter your credentials.
          </p>

          {/* Message Display */}
          {message && (
            <div
              className={`rounded-lg p-3 mb-6 text-center ${
                isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Admin Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="admin@platform.com"
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
                  placeholder="••••••••"
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

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center cursor-pointer shadow-lg"
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
                  Authenticating...
                </>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-gray-500 text-sm text-center">© 2025 TZI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
