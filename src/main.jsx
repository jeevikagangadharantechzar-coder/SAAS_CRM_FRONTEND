// Session/Tab Isolation: Overwrite localStorage with sessionStorage globally
// This isolates the sessions per tab/window, allowing multiple tenants to be logged in
// simultaneously in different tabs/windows, and ensures logging out from an impersonated
// tenant does not log out the superadmin in the parent tab.
try {
  Object.defineProperty(window, "localStorage", {
    value: window.sessionStorage,
    writable: false,
  });
} catch (e) {
  console.warn("Failed to isolate localStorage:", e);
}

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import axios from "axios";
import "./index.css";
import App from "./App.jsx";
import { store } from "./store/store";
import "./services/api"; // Import API config to trigger global interceptors
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Context Providers
import { ModalProvider } from "./context/ModalContext.jsx";
import { TemplateProvider } from "./context/TemplateContext.jsx";

const API_URL = import.meta.env.VITE_API_URL;
const queryClient = new QueryClient();

const loadGlobalSettings = async () => {
  try {
    const { data } = await axios.get(`${API_URL}/settings`);

    // 🔹 Set Company Name
    if (data?.companyName) {
      document.title = data.companyName;
    }

    // 🔹 Set Favicon
    if (data?.favicon) {
      const faviconElement = document.getElementById("dynamic-favicon");
      if (faviconElement) {
        const baseUrl = API_URL.replace("/api", "");
        faviconElement.href = `${baseUrl}/${data.favicon.replace(/\\/g, "/")}`;
      }
    }
  } catch (error) {
    console.error("Failed to load global settings:", error);
  }
};

loadGlobalSettings().finally(() => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ModalProvider>
          <TemplateProvider>
            <Provider store={store}>
              <App />
            </Provider>
          </TemplateProvider>
        </ModalProvider>
      </QueryClientProvider>
    </StrictMode>
  );
});
