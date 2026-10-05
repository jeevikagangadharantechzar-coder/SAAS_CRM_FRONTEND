import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { api } from "../services/api";

export const useDocuments = (filters = {}) => {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.sourceType && filters.sourceType !== "All") params.append("sourceType", filters.sourceType);
      if (filters.status && filters.status !== "All") params.append("status", filters.status);
      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);

      const response = await api.get(`/document-hub/documents?${params.toString()}`);
      return response.data; // { success, data, pagination }
    },
    keepPreviousData: true,
  });
};

export const useRecycleBin = () => {
  return useQuery({
    queryKey: ["documents-recycle-bin"],
    queryFn: async () => {
      const response = await api.get("/document-hub/recycle-bin");
      return response.data.data;
    },
  });
};

export const useUpdateDocumentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }) => {
      const response = await api.patch(`/document-hub/documents/${id}/status`, {
        status,
        note,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      toast.success("Document status updated");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    },
  });
};

export const useAddActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }) => {
      const response = await api.post(`/document-hub/documents/${id}/activity`, {
        text,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      toast.success("Activity added successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to add activity");
    },
  });
};

export const useMarkViewed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await api.patch(`/document-hub/documents/${id}/mark-viewed`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
    }
  });
};

export const useSoftDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await api.delete(`/document-hub/documents/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      queryClient.invalidateQueries(["documents-recycle-bin"]);
      toast.success("Document moved to Recycle Bin");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete document");
    },
  });
};

export const useSoftDeleteSourceDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await api.delete(`/document-hub/documents/source/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      queryClient.invalidateQueries(["documents-recycle-bin"]);
      toast.success("Document moved to Recycle Bin");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete document");
    },
  });
};


export const useRestoreDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await api.post(`/document-hub/documents/${id}/restore`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      queryClient.invalidateQueries(["documents-recycle-bin"]);
      toast.success("Document restored successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to restore document");
    },
  });
};

export const usePermanentDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await api.delete(`/document-hub/documents/${id}/permanent`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents-recycle-bin"]);
      toast.success("Document permanently deleted");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to permanently delete document");
    },
  });
};

export const useUploadExternalDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ formData }) => {
      const response = await api.post("/document-hub/external", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      toast.success("External document uploaded successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to upload document");
    },
  });
};
export const useAssignDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentData) => {
      const response = await api.post("/document-hub/documents/assign", assignmentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      toast.success("Documents assigned successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to assign documents");
    },
  });
};
