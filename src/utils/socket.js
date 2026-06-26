import { io } from "socket.io-client";

let socket = null;

export const initSocket = (userId) => {
  const API_URL = import.meta.env.VITE_SI_URI;

  // DO NOT create socket without a valid userId
  if (!userId) {
    // console.log("initSocket: no userId provided, not creating socket");
    return null;
  }

  if (socket) return socket;

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const name = storedUser.name || "";

  socket = io(API_URL, {
    auth: { userId, name },
    transports: ["websocket"],
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log(" Socket connected:", socket.id, "userId:", userId);
    socket.emit("user_connected", userId); 
  });
  socket.on("connect_error", (err) => {
    console.error(" SOCKET CONNECT ERROR:", err.message);
  });

  socket.on("disconnect", () => {
    console.log(" Socket disconnected:", socket?.id);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
