import { api } from "./api";

/**
 * Products & Services Catalog API service
 * All calls automatically resolve against the current tenant via the api interceptor
 */

// ── Categories ──
export const getCatalogCategories = async (params = {}) => {
  const response = await api.get("/catalog/categories", { params });
  return response.data;
};

export const createCatalogCategory = async (categoryData) => {
  const response = await api.post("/catalog/categories", categoryData);
  return response.data;
};

export const updateCatalogCategory = async (id, categoryData) => {
  const response = await api.put(`/catalog/categories/${id}`, categoryData);
  return response.data;
};

export const deleteCatalogCategory = async (id) => {
  const response = await api.delete(`/catalog/categories/${id}`);
  return response.data;
};

// ── Catalog Items ──
export const getCatalogItems = async (params = {}) => {
  const response = await api.get("/catalog", { params });
  return response.data;
};

export const getCatalogItemById = async (id) => {
  const response = await api.get(`/catalog/${id}`);
  return response.data;
};

export const createCatalogItem = async (itemData) => {
  const response = await api.post("/catalog", itemData);
  return response.data;
};

export const updateCatalogItem = async (id, itemData) => {
  const response = await api.put(`/catalog/${id}`, itemData);
  return response.data;
};

export const toggleCatalogItemStatus = async (id) => {
  const response = await api.patch(`/catalog/${id}/toggle-status`);
  return response.data;
};

export const deleteCatalogItem = async (id) => {
  const response = await api.delete(`/catalog/${id}`);
  return response.data;
};

/**
 * Convert currency using live backend exchange rates
 */
export const getCurrencyExchangeRate = async (from, to, amount) => {
  const res = await api.get('/catalog/exchange-rate', {
    params: { from, to, amount },
  });
  return res.data;
};
