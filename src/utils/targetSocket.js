import { io } from "socket.io-client";

// Dedicated socket connection for Target Management real-time events
// (reminders, due-today warnings, auto-expiry, reassignment) — kept separate
// from the generic notification socket in utils/socket.js.
let targetSocket = null;

export const initTargetSocket = (userId) => {
  const API_URL = import.meta.env.VITE_SI_URI;

  if (!userId) return null;
  if (targetSocket) return targetSocket;

  targetSocket = io(`${API_URL}/target-management`, {
    auth: { userId },
    transports: ["websocket"],
    reconnectionAttempts: 5,
  });

  targetSocket.on("connect", () => {
    console.log("Target-management socket connected:", targetSocket.id, "userId:", userId);
    targetSocket.emit("user_connected", userId);
  });
  targetSocket.on("connect_error", (err) => {
    console.error("TARGET SOCKET CONNECT ERROR:", err.message);
  });
  targetSocket.on("disconnect", () => {
    console.log("Target-management socket disconnected:", targetSocket?.id);
  });

  return targetSocket;
};

export const getTargetSocket = () => targetSocket;

export const disconnectTargetSocket = () => {
  if (targetSocket) {
    targetSocket.disconnect();
    targetSocket = null;
  }
};
