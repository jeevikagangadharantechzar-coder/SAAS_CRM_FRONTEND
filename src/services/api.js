import axios from "axios";
import store from "../store/store";
import { clearCredentials, clearSuperAdminCredentials } from "../store/authSlice";

const BASE_URL = import.meta.env.VITE_SI_URI || "http://localhost:5000";

// Standard tenant user API instance
export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const { token, slug } = store.getState().auth;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (slug && !config.url.startsWith("/superadmin") && !config.url.includes(`/${slug}/api`)) {
    const cleanUrl = config.url.startsWith("/") ? config.url : `/${config.url}`;
    config.url = `/${slug}/api${cleanUrl}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const slug = store.getState().auth.slug;
      if (error.response.data?.planExpired) {
        sessionStorage.setItem(
          "authExpiredNotice",
          JSON.stringify({
            message: error.response.data.message,
            trialExpired: !!error.response.data.trialExpired,
          })
        );
      }
      store.dispatch(clearCredentials());
      if (slug) {
        window.location.href = `/${slug}/login`;
      } else {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

// Superadmin specific instance
export const superApi = axios.create({
  baseURL: `${BASE_URL}/superadmin/api`,
});

superApi.interceptors.request.use((config) => {
  const { superAdminToken } = store.getState().auth;
  if (superAdminToken) {
    config.headers.Authorization = `Bearer ${superAdminToken}`;
  }
  return config;
});

superApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config.url && (error.config.url.includes("/auth/login") || error.config.url.includes("/login"));
      if (!isAuthRoute && window.location.pathname !== "/") {
        store.dispatch(clearSuperAdminCredentials());
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

// Configure the default global axios instance as well to transparently handle existing codebases
axios.interceptors.request.use((config) => {
  const { token, slug } = store.getState().auth;
  const isInternal = !config.url.startsWith("http") || config.url.includes(BASE_URL);
  
  if (isInternal) {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (slug && !config.url.includes("/superadmin")) {
      if (config.url.includes("/api/")) {
        if (!config.url.includes(`/${slug}/api/`)) {
          config.url = config.url.replace("/api/", `/${slug}/api/`);
        }
      } else if (config.url.startsWith("/")) {
        if (!config.url.startsWith(`/${slug}/api`)) {
          config.url = `/${slug}/api${config.url}`;
        }
      }
    }
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config.url && (error.config.url.includes("/auth/login") || error.config.url.includes("/login"));
      if (!isAuthRoute) {
        if (window.location.pathname.startsWith("/superadmin") && window.location.pathname !== "/") {
          store.dispatch(clearSuperAdminCredentials());
          window.location.href = "/";
        } else if (!window.location.pathname.includes("/login")) {
          const slug = store.getState().auth.slug;
          if (error.response.data?.planExpired) {
            sessionStorage.setItem(
              "authExpiredNotice",
              JSON.stringify({
                message: error.response.data.message,
                trialExpired: !!error.response.data.trialExpired,
              })
            );
          }
          store.dispatch(clearCredentials());
          if (slug) {
            window.location.href = `/${slug}/login`;
          } else {
            window.location.href = "/";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);
