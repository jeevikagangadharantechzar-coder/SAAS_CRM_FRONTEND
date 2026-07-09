import { useEffect, useRef } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const REPORT_INTERVAL_MS = 30000;

// Mounted globally (Layout.jsx) for Sales users only. Renders nothing —
// just periodically reports the browser's geolocation while the CRM tab is
// open, so Admins can see live positions on the Live Locations map. Browsers
// can't report location while the tab is closed/backgrounded for long, which
// is an inherent limit of web geolocation vs. a native mobile app.
export default function LocationReporter() {
  const deniedRef = useRef(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.planFeatures?.live_tracking === false) return;
    } catch {
      // Malformed localStorage — fall through and report as usual.
    }

    const report = () => {
      if (deniedRef.current) return;
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const token = localStorage.getItem("token");
            if (!token) return;
            await axios.post(
              `${API_URL}/location/update`,
              { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (err) {
            console.error("Location report failed:", err.message);
          }
        },
        (err) => {
          // Permission denied or unavailable — stop retrying until reload
          // rather than repeatedly prompting/erroring every interval.
          if (err.code === err.PERMISSION_DENIED) deniedRef.current = true;
        },
        { enableHighAccuracy: false, maximumAge: 20000, timeout: 10000 }
      );
    };

    report();
    const interval = setInterval(report, REPORT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
