import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getTenantSubscriptions,
} from "../api/services/subscriptionPlan.service";

export const useGetTenantSubscriptions = (params) => {
  return useQuery({
    queryKey: ["tenant-subscriptions", params],
    queryFn: () => getTenantSubscriptions(params),
    enabled: !!params?.plan_id,
  });
};

export const useGetAllPlans = (filters) => {
  return useQuery({
    queryKey: ["subscription-plans", filters],
    queryFn: () => getAllPlans(filters),
  });
};

export const useGetPlanById = (id) => {
  return useQuery({
    queryKey: ["subscription-plan", id],
    queryFn: () => getPlanById(id),
    enabled: !!id,
  });
};

export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success(data?.message || "Plan created successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || "Failed to create plan");
    },
  });
};

export const useUpdatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updatePlan(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plan", variables.id] });
      toast.success(data?.message || "Plan updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || "Failed to update plan");
    },
  });
};

export const useDeletePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success(data?.message || "Plan deleted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || "Failed to delete plan");
    },
  });
};
