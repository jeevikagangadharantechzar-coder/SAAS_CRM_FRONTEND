// src/components/ui/badge.jsx
import React from "react";

export function Badge({ variant = "default", children }) {
  const variants = {
    default: "bg-gray-200 text-gray-800",
    primary: "bg-blue-600 text-white",
  };

  return <span className={`px-2 py-1 text-xs rounded-md ${variants[variant]}`}>{children}</span>;
}
