import { io } from "socket.io-client";

let socket = null;

export const initSuperAdminSocket = () => {
  if (socket) return socket;

  const API_URL = import.meta.env.VITE_SI_URI || "http://localhost:5000";

  socket = io(`${API_URL}/superadmin`, {
    transports: ["websocket"],
    reconnectionAttempts: 5,
  });

  socket.on("connect", () =>
    console.log("SuperAdmin socket connected:", socket.id)
  );
  socket.on("connect_error", (err) =>
    console.error("SuperAdmin socket error:", err.message)
  );
  socket.on("disconnect", () =>
    console.log("SuperAdmin socket disconnected")
  );

  return socket;
};

export const getSuperAdminSocket = () => socket;

export const disconnectSuperAdminSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
