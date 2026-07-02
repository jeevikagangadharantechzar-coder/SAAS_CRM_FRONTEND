import { createContext, useContext, useState, useEffect } from "react";
import { initSocket } from "../utils/socket";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const SI_URI  = import.meta.env.VITE_SI_URI;
const NotificationContext = createContext();

/* ── Notification Provider ─────────────────────── */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Read user reactively — re-check on every render so login updates are picked up
  const getUser = () => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  };
  const [userId, setUserId] = useState(() => getUser()?._id || null);

  // Listen for login: when localStorage "user" is set, pick up the userId immediately
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "user" || e.key === null) {
        const id = getUser()?._id;
        if (id && id !== userId) setUserId(id);
      }
    };
    window.addEventListener("storage", onStorage);

    // Also poll every 1s until userId is found (covers same-tab login)
    if (!userId) {
      const interval = setInterval(() => {
        const id = getUser()?._id;
        if (id) { setUserId(id); clearInterval(interval); }
      }, 1000);
      return () => { clearInterval(interval); window.removeEventListener("storage", onStorage); };
    }

    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  // Fetch notifications from DB on mount
  const fetchNotifications = async () => {
    const id = getUser()?._id;
    if (!id) return;
    try {
      const tenantSlug = localStorage.getItem("tenantSlug");
      const url = tenantSlug
        ? `${SI_URI}/${tenantSlug}/api/notifications/${id}`
        : `${API_URL}/notifications/${id}`;
      const response = await axios.get(url);
      setNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    if (!userId) return;

    // Fetch existing notifications immediately
    fetchNotifications();

    // Initialize socket
    const socket = initSocket(userId);
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
  }, [userId]);

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);