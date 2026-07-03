import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const userApi = axios.create({
  baseURL: API_URL,
});

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Users
export const getUsers = async () => {
  const response = await userApi.get(`/users`);
  return response.data;
};

export const createUser = async (userData) => {
  const response = await userApi.post(`/users`, userData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await userApi.put(`/users/${id}`, userData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await userApi.delete(`/users/${id}`);
  return response.data;
};

// Roles
export const getRoles = async () => {
  const response = await userApi.get(`/roles`);
  return response.data;
};

export const createRole = async (roleData) => {
  const response = await userApi.post(`/roles`, roleData);
  return response.data;
};

export const updateRole = async (id, roleData) => {
  const response = await userApi.put(`/roles/${id}`, roleData);
  return response.data;
};

export const deleteRole = async (id) => {
  const response = await userApi.delete(`/roles/${id}`);
  return response.data;
};
