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
    mutationFn: async (data: { name: string; personality?: string | null }) => {
      const res = await apiRequest("POST", "/api/twinrays", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays"] });
    },
  });
}

export function useTwinrayGrowthLog(twinrayId: number) {
  return useQuery({
    queryKey: ["/api/twinrays", twinrayId, "growth-log"],
    enabled: !!twinrayId,
  });
}
