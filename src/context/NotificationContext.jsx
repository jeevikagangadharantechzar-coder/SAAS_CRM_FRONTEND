import { createContext, useContext, useState, useEffect } from "react";
import { initSocket } from "../utils/socket";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const NotificationContext = createContext();

/* ── Notification Provider ─────────────────────── */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch notifications from DB on mount
  const fetchNotifications = async () => {
    if (!user?._id) return;
    try {
      const response = await axios.get(`${API_URL}/notifications/${user._id}`);
      setNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    if (!user?._id) return;

    // Fetch existing notifications
    fetchNotifications();

    // Initialize socket
    const socket = initSocket(user._id);
    if (!socket) return;

    const handleNewNotification = (data) => {
      console.log(" New notification received:", data);

      const normalizedTitle = () => {
        if (data.title && !["Activity Reminder", "activity reminder"].includes(data.title)) {
          return data.title;
        }

        if (data.type === "followup") {
          if (data.meta?.dealId) return "Deal Follow-up";
          if (data.meta?.proposalId) return "Proposal Follow-up";
          if (data.meta?.leadId) return "Lead Follow-up";
          return "Follow-up";
        }

        if (data.type === "contact_form") return "Website Contact Form";
        return "Notification";
      };

      const notif = {
        _id: data._id || data.id || `${Date.now()}-${Math.random()}`,
        title: normalizedTitle(),
        text: data.text || data.message || "",
        message: data.message || data.text || "",
        read: false,
        profileImage: data.profileImage || "/default-avatar.png",
        createdAt: data.createdAt || new Date().toISOString(),
        followUpDate: data.followUpDate || null,
        meta: data.meta || {},
        type: data.type || "notification",
      };

      setNotifications((prev) => {
        if (notif._id && prev.some((n) => n._id === notif._id)) {
          console.log(" Duplicate notification skipped (same ID)");
          return prev;
        }
        
        console.log(" Adding new notification:", notif);
        return [notif, ...prev];
      });
    };

    const handleNotificationDeleted = (data) => {
      console.log(" Notification deletion received:", data);
      const { ids } = data;
      if (Array.isArray(ids) && ids.length > 0) {
        if (ids[0] === 'all') {
          // Clear all and fetch fresh
          fetchNotifications();
        } else {
          setNotifications((prev) =>
            prev.filter((n) => !ids.includes(String(n._id)))
          );
        }
      }
    };

    //  Use correct event name "new_notification" (not "notification")
    socket.on("new_notification", handleNewNotification);
    socket.on("activity_reminder", handleNewNotification);
    socket.on("admin_reminder", handleNewNotification);
    socket.on("notification_deleted", handleNotificationDeleted);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("activity_reminder", handleNewNotification);
      socket.off("admin_reminder", handleNewNotification);
      socket.off("notification_deleted", handleNotificationDeleted);
    };
  }, [user?._id]);

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);