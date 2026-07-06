import React, { createContext, useContext, useEffect, useState } from "react";
import { initTargetSocket } from "../utils/targetSocket";

const TargetSocketContext = createContext(null);

export const TargetSocketProvider = ({ userId, children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const s = initTargetSocket(userId);
    setSocket(s);
  }, [userId]);

  return (
    <TargetSocketContext.Provider value={socket}>
      {children}
    </TargetSocketContext.Provider>
  );
};

export const useTargetSocket = () => useContext(TargetSocketContext);
