import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useThreads(islandId: number) {
  return useQuery({
    queryKey: ['/api/islands', islandId, 'threads'],
    queryFn: async () => {
      const res = await fetch(`/api/islands/${islandId}/threads`, { credentials: "include" });
      if (!res.ok) throw new Error("スレッドの取得に失敗しました");
      return res.json();
    },
    enabled: !!islandId,
  });
}

export function useThread(id: number) {
  return useQuery({
    queryKey: ['/api/threads', id],
    queryFn: async () => {
      const res = await fetch(`/api/threads/${id}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("スレッドの取得に失敗しました");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ islandId, title, firstPost }: { islandId: number; title: string; firstPost?: string }) => {
      const res = await fetch(`/api/islands/${islandId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, firstPost }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "スレッドの作成に失敗しました");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/islands', variables.islandId, 'threads'] });
      queryClient.invalidateQueries({ queryKey: [api.islands.get.path, variables.islandId] });
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, content, meidiaId, parentPostId }: { threadId: number; content: string; meidiaId?: number | null; parentPostId?: number | null }) => {
      const res = await fetch(`/api/threads/${threadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, meidiaId, parentPostId }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "投稿に失敗しました");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/threads', variables.threadId] });
    },
  });
}
