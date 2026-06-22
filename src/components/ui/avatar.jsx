// src/components/ui/avatar.jsx
import React from "react";

export function Avatar({ className, children }) {
  return <div className={`w-10 h-10 rounded-full overflow-hidden ${className}`}>{children}</div>;
}

export function AvatarImage({ src, alt }) {
  return <img className="w-full h-full object-cover" src={src} alt={alt} />;
}
