import React, { useState, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { Bell, Trash2, Clock, CheckCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { buildProfileImageUrl } from "../useroles/UserManagement";

const DEFAULT_AVATAR =
  "https://static.vecteezy.com/system/resources/previews/020/429/953/non_2x/admin-icon-vector.jpg";

const NotificationsPage = () => {
  const { notifications, setNotifications, fetchNotifications } = useNotifications();
  const [deletingId, setDeletingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilter = location.state?.filter || "all";
  const [filter, setFilter] = useState(initialFilter);

  const API_URL = import.meta.env.VITE_API_URL;
  const API_SI = import.meta.env.VITE_SI_URI;

  useEffect(() => {
    if (!location.state?.filter) setFilter("all");
  }, [location.state]);

  // ✅ SINGLE cleanup effect - REMOVED the duplicate interval
  useEffect(() => {
    const cleanupExpired = () => {
      const now = new Date();

      setNotifications((prev) =>
        prev.filter((n) => {
          // Safely calculate expiry
          let expiresAt;
          if (n.expiresAt) {
            expiresAt = new Date(n.expiresAt);
          } else {
            expiresAt = new Date(new Date(n.createdAt).getTime() + 24 * 60 * 60 * 1000);
          }

          // Prevent NaN bug
          if (isNaN(expiresAt.getTime())) return false;

          // Keep only non-expired notifications
          return expiresAt > now;
        })
      );
    };

    // Run cleanup every minute
    const interval = setInterval(cleanupExpired, 60000);
    
    // Run immediately on mount
    cleanupExpired();

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [setNotifications]); // ✅ Added proper dependency

  // Refresh notifications
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const response = await axios.get(`${API_URL}/notification/${user?._id}`);
      setNotifications(response.data);
      setSelectedIds([]);
      setSelectAll(false);
      toast.success("Notifications refreshed");
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      setSelectAll(next.length === filteredNotifications.length && filteredNotifications.length > 0);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
      return;
    }
    const allIds = filteredNotifications.map((n) => n._id);
    setSelectedIds(allIds);
    setSelectAll(true);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      toast.info("Select notifications to delete");
      return;
    }

    try {
      await axios.delete(`${API_URL}/notification/bulk`, { data: { ids: selectedIds } });
      setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n._id)));
      setSelectedIds([]);
      setSelectAll(false);
      toast.success(`Deleted ${selectedIds.length} notification(s)`);
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error("Failed to delete selected notifications");
    }
  };

  // Delete single notification
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API_URL}/notification/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      setSelectAll(false);
      toast.success("Notification deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete notification");
    } finally {
      setTimeout(() => setDeletingId(null), 300);
    }
  };

  // Mark as read
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/notification/read/${id}`,
        { read: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      toast.success("Marked as read");
    } catch (err) {
      console.error("Mark read error:", err?.response?.data || err.message);
      toast.error("Failed to mark as read");
    }
  };

  // Contact form notification click function
  const handleNotificationClick = async (notification) => {
    if (notification.type !== "contact_form") return;

    try {
      const token = localStorage.getItem("token");
      if (!notification.read) {
        await axios.patch(
          `${API_URL}/notification/read/${notification._id}`,
          { read: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, read: true } : n
          )
        );
      }

      navigate("/createleads", {
        state: {
          fromNotification: true,
          contactFormData: notification.meta,
        },
      });
    } catch (err) {
      toast.error("Failed to open contact form");
    }
  };

  // ✅ Filter notifications (remove expired ones first)
  const now = new Date();
  let filteredNotifications = notifications.filter((n) => {
    // Safely calculate expiry
    let expiresAt;
    if (n.expiresAt) {
      expiresAt = new Date(n.expiresAt);
    } else {
      expiresAt = new Date(new Date(n.createdAt).getTime() + 24 * 60 * 60 * 1000);
    }

    // Skip if date is invalid
    if (isNaN(expiresAt.getTime())) return false;

    // Remove expired notifications
    if (expiresAt <= now) return false;

    // Then filter by type
    if (filter === "all") return true;
    if (filter === "followup") return n.type === "followup";
    if (filter === "activity") return n.type === "activity" || n.type === "admin";
    if (filter === "contact_form") return n.type === "contact_form";
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  // Sort unread first, then by date (newest first)
  filteredNotifications = filteredNotifications.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Update selection state when filtered list changes
  useEffect(() => {
    const visibleIds = filteredNotifications.map((n) => n._id);
    setSelectedIds((current) => current.filter((id) => visibleIds.includes(id)));
    setSelectAll(
      filteredNotifications.length > 0 && 
      selectedIds.length === filteredNotifications.length &&
      selectedIds.length > 0
    );
  }, [filteredNotifications.length, notifications.length, filter]);

  return (
    <div className="w-full mx-auto p-4 md:p-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <Bell className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
              Notifications
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Stay updated with your alerts
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          {notifications.length > 0 && (
            <>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Refresh notifications"
              >
                <RefreshCw size={18} className={`${refreshing ? "animate-spin" : ""} text-gray-600 dark:text-gray-400`} />
              </button>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Delete {selectedIds.length} selected
                </button>
              )}
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {notifications.filter((n) => !n.read).length}
                </span>{" "}
                unread
              </div>

              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-inner">
                {["all", "unread", "read"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                      filter === t
                        ? t === "unread"
                          ? "bg-blue-100 dark:bg-blue-900/40 shadow-sm font-medium text-blue-700 dark:text-blue-300"
                          : t === "read"
                          ? "bg-green-100 dark:bg-green-900/40 shadow-sm font-medium text-green-700 dark:text-green-300"
                          : "bg-white dark:bg-gray-700 shadow-sm font-medium text-gray-800 dark:text-gray-200"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs for type */}
      <div className="flex gap-2 mb-4">
        {["all", "followup", "activity", "contact_form"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filter === t
                ? "bg-blue-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {t === "contact_form" ? "Website Contacts" :
             t === "followup" ? "Lead follow-ups" : 
             t === "activity" ? "Activity updates" : "All"}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={handleToggleSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">Select all</span>
        </div>
        {selectedIds.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedIds.length} selected
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => {
            const createdAt = new Date(n.createdAt);
            
            // ✅ SAFE hours calculation - FIX for NaN bug
            let hoursLeft = 0;
            let expiresAt = null;
            
            if (n.expiresAt) {
              expiresAt = new Date(n.expiresAt);
            } else {
              expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
            }
            
            // Only calculate if date is valid
            if (expiresAt && !isNaN(expiresAt.getTime())) {
              hoursLeft = differenceInHours(expiresAt, new Date());
            }
            
            const isExpired = hoursLeft <= 0;

            return (
              <div
                key={n._id}
                onClick={() => n.type === "contact_form" && handleNotificationClick(n)}
                className={`relative group p-5 rounded-2xl transition-all duration-300 border
                  ${n.type === "contact_form" ? "cursor-pointer hover:ring-2 hover:ring-blue-400" : ""}
                  ${
                    n.read
                      ? "bg-white dark:bg-gray-800/70 border-gray-200 dark:border-gray-700/50 shadow-sm"
                      : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800/30 shadow-md"
                  }
                `}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 relative mr-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(n._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(n._id);
                      }}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <img
                      src={
                        n.profileImage
                          ? buildProfileImageUrl(n.profileImage, API_SI)
                          : DEFAULT_AVATAR
                      }
                      alt="User"
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm bg-gray-100 mt-2"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_AVATAR;
                      }}
                    />
                    {!n.read && (
                      <div className="absolute -top-1 -right-1">
                        <div className="bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                          <div className="bg-blue-500 rounded-full w-2 h-2 animate-ping absolute"></div>
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p
                          className={`text-base font-semibold ${
                            n.read
                              ? "text-gray-700 dark:text-gray-200"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {n.title || "Notification"}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 leading-relaxed">
                          {n.text}
                        </p>
                        {n.followUpDate && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Follow-up date: {new Date(n.followUpDate).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(n._id);
                        }}
                        disabled={deletingId === n._id}
                        className="ml-4 flex items-center justify-center p-2 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 rounded-xl transition-all duration-200 transform hover:scale-110"
                      >
                        {deletingId === n._id ? (
                          <div className="w-5 h-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={14} className="mr-1.5" />
                        {n.createdAt
                          ? formatDistanceToNow(createdAt, { addSuffix: true })
                          : "Just now"}
                      </div>

                      {!n.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n._id);
                          }}
                          className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                        >
                          <CheckCircle size={14} className="mr-1.5" />
                          Mark as read
                        </button>
                      )}

                      {/* ✅ Safe expiry display - no NaN */}
                      {!isNaN(hoursLeft) && (
                        <div
                          className={`flex items-center text-xs font-medium ${
                            isExpired ? "text-red-500" : "text-amber-500"
                          }`}
                        >
                          <Clock size={14} className="mr-1.5" />
                          {isExpired
                            ? "Expired"
                            : `Expires in ${hoursLeft} hour${hoursLeft > 1 ? "s" : ""}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-4">
              <Bell size={30} className="text-gray-400 dark:text-gray-300" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              No notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;