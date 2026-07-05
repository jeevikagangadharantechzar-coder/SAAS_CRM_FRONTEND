import { api } from "../services/api";

const BASE_URL = import.meta.env.VITE_SI_URI || "http://localhost:5000";

export const applyTenantBranding = async () => {
  try {
    const { data } = await api.get("/settings");

    if (data?.companyName) {
      document.title = data.companyName;
    }

    if (data?.favicon) {
      const faviconElement = document.getElementById("dynamic-favicon");
      if (faviconElement) {
        faviconElement.href = `${BASE_URL}/${data.favicon.replace(/\\/g, "/")}`;
      }
    }
  } catch (error) {
    console.error("Failed to apply tenant branding:", error);
  }
};
