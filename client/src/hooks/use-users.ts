import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type UserResponse } from "@shared/routes";

export function useUsers(search?: string, accountType?: string) {
  return useQuery({
    queryKey: ['/api/users', search, accountType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (accountType) params.set('accountType', accountType);
      const url = `/api/users${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: [api.users.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.users.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.users.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; bio?: string | null; tenmei?: string | null; tenshoku?: string | null; tensaisei?: string | null; gender?: string | null; profileVisibility?: string }) => {
      const url = buildUrl(api.users.update.path, { id });
      const res = await fetch(url, {
        method: api.users.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (res.status === 400) {
        const error = await res.json();
        throw new Error(error.message || "更新に失敗しました");
      }
      if (res.status === 401) throw new Error("認証が必要です");
      if (res.status === 403) throw new Error("権限がありません");
      if (res.status === 404) throw new Error("ユーザーが見つかりません");
      if (!res.ok) throw new Error("更新に失敗しました");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.users.get.path, variables.id] });
    },
  });
}
