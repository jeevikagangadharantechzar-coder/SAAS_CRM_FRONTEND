import { io } from "socket.io-client";

// Dedicated socket client for free-trial expiry events, separate from
// utils/socket.js (the generic notification bell socket) — connects to the
// backend's /free-trial namespace (realtime/freeTrialSocket.js).
let trialSocket = null;

export const initFreeTrialSocket = (userId) => {
  const API_URL = import.meta.env.VITE_SI_URI;

  if (!userId) return null;
  if (trialSocket) return trialSocket;

  let dbName = null;
  try {
    const token = localStorage.getItem("token");
    if (token) dbName = JSON.parse(atob(token.split(".")[1])).dbName || null;
  } catch {}

  trialSocket = io(`${API_URL}/free-trial`, {
    auth: { userId, dbName },
    transports: ["websocket"],
    reconnectionAttempts: 5,
  });

  trialSocket.on("connect", () => {
    trialSocket.emit("user_connected", userId);
  });
  trialSocket.on("connect_error", (err) => {
    console.error("Free-trial socket connect error:", err.message);
  });

  return trialSocket;
};

export const getFreeTrialSocket = () => trialSocket;

export const disconnectFreeTrialSocket = () => {
  if (trialSocket) {
    trialSocket.disconnect();
    trialSocket = null;
  }
};
