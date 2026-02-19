import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type MeidiaResponse, type CreateMeidiaInput } from "@shared/routes";

export function useMeidiaList(userId?: number) {
  return useQuery({
    queryKey: userId ? [api.meidia.list.path, userId] : [api.meidia.list.path],
    queryFn: async () => {
      const params = userId ? `?userId=${userId}` : "";
      const res = await fetch(`${api.meidia.list.path}${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch MEiDIA");
      return api.meidia.list.responses[200].parse(await res.json());
    },
  });
}

export function useMeidia(id: number) {
  return useQuery({
    queryKey: [api.meidia.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.meidia.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 403) {
        const error = await res.json();
        throw new Error(error.message || "Access forbidden");
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch MEiDIA");
      return api.meidia.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateMeidia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMeidiaInput) => {
      const validated = api.meidia.create.input.parse(data);
      const res = await fetch(api.meidia.create.path, {
        method: api.meidia.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (res.status === 400) {
        const error = await res.json();
        throw new Error(error.message || "Validation failed");
      }
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to create MEiDIA");
      return api.meidia.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.meidia.list.path] });
    },
  });
}

export function useIncrementDownload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.meidia.incrementDownload.path, { id });
      const res = await fetch(url, {
        method: api.meidia.incrementDownload.method,
        credentials: "include",
      });
      if (res.status === 404) throw new Error("MEiDIA not found");
      if (!res.ok) throw new Error("Failed to increment download");
      return api.meidia.incrementDownload.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.meidia.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.meidia.list.path] });
    },
  });
}

export function useAttachMeidiaToIsland() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meidiaId, islandId, type }: { meidiaId: number; islandId: number; type: "activity" | "report" }) => {
      const url = buildUrl(api.meidia.attachToIsland.path, { id: meidiaId });
      const res = await fetch(url, {
        method: api.meidia.attachToIsland.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ islandId, type }),
        credentials: "include",
      });
      if (res.status === 400) {
        const error = await res.json();
        throw new Error(error.message || "Validation failed");
      }
      if (res.status === 401) throw new Error("Unauthorized");
      if (res.status === 403) throw new Error("Forbidden");
      if (res.status === 404) throw new Error("MEiDIA or Island not found");
      if (!res.ok) throw new Error("Failed to attach MEiDIA");
      return api.meidia.attachToIsland.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.islands.get.path] });
    },
  });
}
