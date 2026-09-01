import React, { useState, useEffect } from "react";
import axios from "axios";
import { X } from "lucide-react";
import { useSelector } from "react-redux";

const MfaSetupModal = ({ isOpen, onClose, mfaEndpoint, onComplete }) => {
  const [qrCode, setQrCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { tenantSlug, token: userToken, superAdminToken } = useSelector((state) => state.auth);
  
  const token = mfaEndpoint.includes("superadmin") 
    ? (superAdminToken || localStorage.getItem("superAdminToken"))
    : (userToken || localStorage.getItem("token"));

  useEffect(() => {
    if (isOpen) {
      setupMfa();
    }
  }, [isOpen]);

  const setupMfa = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axios.post(
        `${mfaEndpoint}/setup`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-tenant-slug": tenantSlug || "",
          },
        }
      );
      if (response.data.qrCode) {
        setQrCode(response.data.qrCode);
      }
    } catch (err) {
      console.error("MFA Setup Error:", err);
      setError(err.response?.data?.details || err.response?.data?.message || err.response?.data?.error || err.message || "Failed to setup MFA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await axios.post(
        `${mfaEndpoint}/enable`,
        { token: mfaCode },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-tenant-slug": tenantSlug || "",
          },
        }
      );
      onComplete();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to enable MFA");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Set Up Two-Factor Authentication</h2>
          <p className="text-sm text-gray-600 mb-4">
            Scan the QR code below with your authenticator app (like Google Authenticator or Authy) and enter the 6-digit code.
          </p>

          {error && <div className="mb-4 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}

          {isLoading && !qrCode ? (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            qrCode && (
              <div className="flex flex-col items-center">
                <img src={qrCode} alt="MFA QR Code" className="w-48 h-48 mb-4 border border-gray-200 rounded p-2" />
                <form onSubmit={handleEnable} className="w-full">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter 6-digit code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                      placeholder="000000"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || mfaCode.length !== 6}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? "Verifying..." : "Verify & Enable"}
                  </button>
                </form>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MfaSetupModal;
