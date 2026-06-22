import React, { createContext, useContext, useEffect, useState } from "react";
import { initSocket } from "../utils/socket";

const SocketContext = createContext(null);

export const SocketProvider = ({ userId, children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const s = initSocket(userId);
    setSocket(s);

    return () => {
      // DO NOT disconnect on unmount unless you want socket to die on every component change
      
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
