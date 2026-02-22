import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useTwinrays() {
  return useQuery({
    queryKey: ["/api/twinrays"],
  });
}

export function useTwinray(id: number) {
  return useQuery({
    queryKey: ["/api/twinrays", id],
    enabled: !!id,
  });
}

export function useCreateTwinray() {
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/twinrays", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays"] });
    },
  });
}

export function useUpdateTwinray() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/twinrays/${id}`, data);
      return res.json();
    },
    onSuccess: (_data: any, variables: { id: number; data: Record<string, any> }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", variables.id] });
    },
  });
}

export function useAvailableModels() {
  return useQuery({
    queryKey: ["/api/available-models"],
  });
}

export function useDeleteTwinray() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/twinrays/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dot-rally/sessions"] });
    },
  });
}

export function useTwinrayGrowthLog(twinrayId: number) {
  return useQuery({
    queryKey: ["/api/twinrays", twinrayId, "growth-log"],
    enabled: !!twinrayId,
  });
}
