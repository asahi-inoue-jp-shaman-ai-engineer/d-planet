import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type IslandResponse, type IslandDetailResponse, type CreateIslandInput } from "@shared/routes";

export function useIslands() {
  return useQuery({
    queryKey: [api.islands.list.path],
    queryFn: async () => {
      const res = await fetch(api.islands.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch islands");
      return api.islands.list.responses[200].parse(await res.json());
    },
  });
}

export function useIsland(id: number) {
  return useQuery({
    queryKey: [api.islands.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.islands.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 403) {
        const error = await res.json();
        throw new Error(error.message || "Access forbidden");
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch island");
      return api.islands.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateIsland() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateIslandInput) => {
      const validated = api.islands.create.input.parse(data);
      const res = await fetch(api.islands.create.path, {
        method: api.islands.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (res.status === 400) {
        const error = await res.json();
        throw new Error(error.message || "Validation failed");
      }
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to create island");
      return api.islands.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.islands.list.path] });
    },
  });
}

export function useUpdateIsland() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<CreateIslandInput>) => {
      const validated = api.islands.update.input.parse(updates);
      const url = buildUrl(api.islands.update.path, { id });
      const res = await fetch(url, {
        method: api.islands.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (res.status === 400) {
        const error = await res.json();
        throw new Error(error.message || "Validation failed");
      }
      if (res.status === 401) throw new Error("Unauthorized");
      if (res.status === 403) throw new Error("Forbidden");
      if (res.status === 404) throw new Error("Island not found");
      if (!res.ok) throw new Error("Failed to update island");
      return api.islands.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.islands.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.islands.get.path] });
    },
  });
}
