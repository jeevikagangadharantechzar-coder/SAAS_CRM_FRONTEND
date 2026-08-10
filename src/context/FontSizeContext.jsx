import { createContext, useContext, useEffect, useState } from "react";

const FontSizeContext = createContext(null);

const STORAGE_KEY = "fontSizePreference";
const VALID_SIZES = ["small", "normal", "large"];

export const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSizeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_SIZES.includes(stored) ? stored : "normal";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  const setFontSize = (size) => {
    if (!VALID_SIZES.includes(size)) return;
    setFontSizeState(size);
    localStorage.setItem(STORAGE_KEY, size);
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => useContext(FontSizeContext);
