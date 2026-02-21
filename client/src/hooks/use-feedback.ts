import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateFeedbackInput } from "@shared/routes";

export function useFeedbackList() {
  return useQuery({
    queryKey: [api.feedback.list.path],
    queryFn: async () => {
      const res = await fetch(api.feedback.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("報告の取得に失敗しました");
      return api.feedback.list.responses[200].parse(await res.json());
    },
  });
}

export function useFeedback(id: number) {
  return useQuery({
    queryKey: [api.feedback.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.feedback.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("報告の取得に失敗しました");
      return api.feedback.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useResolveFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adminNote }: { id: number; adminNote?: string }) => {
      const res = await fetch(`/api/feedback/${id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.feedback.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.feedback.get.path, variables.id] });
    },
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFeedbackInput) => {
      const validated = api.feedback.create.input.parse(data);
      const res = await fetch(api.feedback.create.path, {
        method: api.feedback.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (res.status === 400) {
        const error = await res.json();
        throw new Error(error.message || "入力内容に誤りがあります");
      }
      if (res.status === 401) throw new Error("ログインが必要です");
      if (!res.ok) throw new Error("作成に失敗しました");
      return api.feedback.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.feedback.list.path] });
    },
  });
}
