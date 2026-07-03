import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const playAlarmSound = () => {
  try {
    const ctx = new (window.AudioContext || window["webkitAudioContext"])();
    [0, 0.3, 0.6].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch (_) {}
};

const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
};

const showBrowserNotification = (meeting) => {
  if (Notification.permission !== "granted") return;
  const n = new Notification(`Meeting starting in ${meeting.reminderMinutes} min`, {
    body: meeting.title,
    icon: "/favicon.ico",
    tag: meeting._id,
  });
  n.onclick = () => {
    if (meeting.meetLink) window.open(meeting.meetLink, "_blank");
    n.close();
  };
};

export default function useMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [zoomConfigured, setZoomConfigured] = useState(false);
  const [alarmFired, setAlarmFired] = useState(null);
  const timersRef = useRef([]);

  const clearAlarmTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const scheduleAlarms = useCallback((list) => {
    clearAlarmTimers();
    const now = Date.now();
    list.forEach((meeting) => {
      if (meeting.status !== "scheduled") return;
      const start = new Date(meeting.startDateTime).getTime();
      const delay = start - (meeting.reminderMinutes || 10) * 60_000 - now;
      if (delay <= 0) return;
      const t = setTimeout(() => {
        playAlarmSound();
        showBrowserNotification(meeting);
        setAlarmFired(meeting);
      }, delay);
      timersRef.current.push(t);
    });
  }, []);

  const checkGoogleStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/google-auth/auth/status`, authHeader());
      setGoogleConfigured(res.data.connected);
    } catch {
      setGoogleConfigured(false);
    }
  }, []);

  const checkZoomStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/zoom-auth/auth/status`, authHeader());
      setZoomConfigured(res.data.connected);
    } catch {
      setZoomConfigured(false);
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/meetings`, authHeader());
      const list = res.data.meetings || [];
      setMeetings(list);
      scheduleAlarms(list);
    } catch {
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, [scheduleAlarms]);

  useEffect(() => {
    requestNotificationPermission();
    checkGoogleStatus();
    checkZoomStatus();
    fetchMeetings();
    return () => clearAlarmTimers();
  }, [fetchMeetings, checkGoogleStatus, checkZoomStatus]);

  const createMeeting = async (data) => {
    const res = await axios.post(`${API_URL}/meetings`, data, authHeader());
    const created = res.data.meeting;
    setMeetings((prev) => {
      const updated = [...prev, created].sort(
        (a, b) => new Date(a.startDateTime) - new Date(b.startDateTime)
      );
      scheduleAlarms(updated);
      return updated;
    });
    toast.success("Meeting created");
    return created;
  };

  const updateMeeting = async (id, data) => {
    const res = await axios.put(`${API_URL}/meetings/${id}`, data, authHeader());
    const updated = res.data.meeting;
    setMeetings((prev) => {
      const list = prev.map((m) => (m._id === id ? updated : m));
      scheduleAlarms(list);
      return list;
    });
    toast.success("Meeting updated");
    return updated;
  };

  const cancelMeeting = async (id) => {
    const res = await axios.put(`${API_URL}/meetings/${id}`, { status: "cancelled" }, authHeader());
    const updated = res.data.meeting;
    setMeetings((prev) => {
      const list = prev.map((m) => (m._id === id ? updated : m));
      scheduleAlarms(list);
      return list;
    });
    toast.success("Meeting cancelled");
  };

  const connectGoogle = async () => {
    try {
      const res = await axios.get(`${API_URL}/google-auth/auth/google`, authHeader());
      if (res.data.authUrl) window.location.href = res.data.authUrl;
    } catch {
      toast.error("Failed to start Google auth");
    }
  };

  return {
    meetings,
    loading,
    googleConfigured,
    zoomConfigured,
    alarmFired,
    setAlarmFired,
    createMeeting,
    updateMeeting,
    cancelMeeting,
    connectGoogle,
    refetch: fetchMeetings,
  };
}
