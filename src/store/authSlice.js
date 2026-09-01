import { createSlice } from "@reduxjs/toolkit";

const initialToken = localStorage.getItem("token") || null;
const initialSlug = localStorage.getItem("tenantSlug") || null;
const initialUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
const initialSuperAdminToken = localStorage.getItem("superAdminToken") || null;
const initialSuperAdmin = localStorage.getItem("superAdmin") ? JSON.parse(localStorage.getItem("superAdmin")) : null;

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: initialToken,
    slug: initialSlug,
    user: initialUser,
    superAdminToken: initialSuperAdminToken,
    superAdmin: initialSuperAdmin,
  },
  reducers: {
    setCredentials: (state, action) => {
      const { token, slug, user } = action.payload;
      state.token = token;
      state.slug = slug;
      state.user = user;

      if (token) localStorage.setItem("token", token);
      else localStorage.removeItem("token");

      if (slug) localStorage.setItem("tenantSlug", slug);
      else localStorage.removeItem("tenantSlug");

      if (user) localStorage.setItem("user", JSON.stringify(user));
      else localStorage.removeItem("user");
    },
    setSuperAdminCredentials: (state, action) => {
      const { token, admin } = action.payload;
      state.superAdminToken = token;
      state.superAdmin = admin || null;

      if (token) localStorage.setItem("superAdminToken", token);
      else localStorage.removeItem("superAdminToken");

      if (admin) localStorage.setItem("superAdmin", JSON.stringify(admin));
      else localStorage.removeItem("superAdmin");
    },
    clearCredentials: (state) => {
      state.token = null;
      state.slug = null;
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("tenantSlug");
      localStorage.removeItem("user");
    },
    updateSuperAdminProfile: (state, action) => {
      state.superAdmin = action.payload;
      localStorage.setItem("superAdmin", JSON.stringify(action.payload));
    },
    clearSuperAdminCredentials: (state) => {
      state.superAdminToken = null;
      state.superAdmin = null;
      localStorage.removeItem("superAdminToken");
      localStorage.removeItem("superAdmin");
    },
  },
});

export const {
  setCredentials,
  setSuperAdminCredentials,
  updateSuperAdminProfile,
  clearCredentials,
  clearSuperAdminCredentials,
} = authSlice.actions;

export default authSlice.reducer;
