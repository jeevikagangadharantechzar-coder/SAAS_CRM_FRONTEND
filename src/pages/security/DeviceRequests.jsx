import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Smartphone, Monitor, Check, X, ShieldAlert } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function DeviceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${API_URL}/users/device-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Fetch device requests error:", err);
      toast.error("Failed to load device login requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    // Pending requests aren't pushed live to this page (only the salesperson's
    // own login-approval poll is time-sensitive) — a light refresh interval
    // is enough to keep the queue current while an admin has it open.
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const decide = async (id, action) => {
    try {
      setDecidingId(id);
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/users/device-requests/${id}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(action === "approve" ? "Device approved" : "Device rejected");
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error(`${action} device request error:`, err);
      toast.error(err.response?.data?.message || `Failed to ${action} device`);
    } finally {
      setDecidingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-[#008ecc]" />
          Device Login Requests
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Sales users are limited to one web and one mobile session at a time. Approve a request below
          to let them sign in on a new device — this will sign them out of their existing device of the
          same type.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
          No pending device login requests.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r._id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  {r.deviceType === "mobile" ? (
                    <Smartphone className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Monitor className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {r.userId?.firstName} {r.userId?.lastName}
                    <span className="text-gray-400 font-normal"> · {r.userId?.email}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Requesting {r.deviceType} login — {r.deviceLabel || "unknown device"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(r.requestedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => decide(r._id, "reject")}
                  disabled={decidingId === r._id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-60"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => decide(r._id, "approve")}
                  disabled={decidingId === r._id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#008ecc] hover:bg-[#007bb0] disabled:opacity-60"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
