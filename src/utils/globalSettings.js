import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

let settingsPromise = null;

// Shared, request-deduped fetch for the unauthenticated GET /settings
// endpoint. main.jsx (page title/favicon) and Sidebar (company logo) both
// want data from this same response — without this cache each mount fired
// its own independent request for overlapping data.
export const getGlobalSettings = () => {
  if (!settingsPromise) {
    settingsPromise = axios
      .get(`${API_URL}/settings`)
      .then((res) => res.data)
      .catch((err) => {
        // Let the next caller retry instead of caching a failure forever.
        settingsPromise = null;
        throw err;
      });
  }
  return settingsPromise;
};
