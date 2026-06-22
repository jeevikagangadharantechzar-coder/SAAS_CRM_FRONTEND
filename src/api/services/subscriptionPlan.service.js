import axios from "axios";
import { store } from "../../store/store";

const BASE_URL = import.meta.env.VITE_SI_URI || "http://localhost:5000";
const BASE = "/api/superadmin/subscription-plans";

const subscriptionApi = axios.create({
  baseURL: BASE_URL,
});

subscriptionApi.interceptors.request.use((config) => {
  const { superAdminToken } = store.getState().auth;
  if (superAdminToken) {
    config.headers.Authorization = `Bearer ${superAdminToken}`;
  }
  return config;
});

export const getAllPlans = async (params) => {
  const response = await subscriptionApi.get(BASE, { params });
  return response.data;
};

export const getPlanById = async (id) => {
  const response = await subscriptionApi.get(`${BASE}/${id}`);
  return response.data;
};

export const createPlan = async (data) => {
  const response = await subscriptionApi.post(BASE, data);
  return response.data;
};

export const updatePlan = async (id, data) => {
  const response = await subscriptionApi.put(`${BASE}/${id}`, data);
  return response.data;
};

export const deletePlan = async (id) => {
  const response = await subscriptionApi.delete(`${BASE}/${id}`);
  return response.data;
};

export const getPublicPlans = async () => {
  const response = await subscriptionApi.get(`${BASE}/public`);
  return response.data;
};

export const getTenantSubscriptions = async (params) => {
  const response = await subscriptionApi.get(`${BASE}/tenant-subscriptions`, { params });
  return response.data;
};

export const assignPlanToTenant = async (data) => {
  const response = await subscriptionApi.post(`${BASE}/assign-to-tenant`, data);
  return response.data;
};
