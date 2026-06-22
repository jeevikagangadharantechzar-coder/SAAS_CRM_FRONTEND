import { createSlice } from "@reduxjs/toolkit";

const initialToken = localStorage.getItem("token") || null;
const initialSlug = localStorage.getItem("tenantSlug") || null;
const initialUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
const initialSuperAdminToken = localStorage.getItem("superAdminToken") || null;

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: initialToken,
    slug: initialSlug,
    user: initialUser,
    superAdminToken: initialSuperAdminToken,
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
      const { token } = action.payload;
      state.superAdminToken = token;
      if (token) localStorage.setItem("superAdminToken", token);
      else localStorage.removeItem("superAdminToken");
    },
    clearCredentials: (state) => {
      state.token = null;
      state.slug = null;
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("tenantSlug");
      localStorage.removeItem("user");
    },
    clearSuperAdminCredentials: (state) => {
      state.superAdminToken = null;
      localStorage.removeItem("superAdminToken");
    },
  },
});

export const {
  setCredentials,
  setSuperAdminCredentials,
  clearCredentials,
  clearSuperAdminCredentials,
} = authSlice.actions;

export default authSlice.reducer;
