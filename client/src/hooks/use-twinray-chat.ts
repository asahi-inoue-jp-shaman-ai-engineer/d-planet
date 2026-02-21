import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useTwinrayChatMessages(twinrayId: number) {
  return useQuery({
    queryKey: ["/api/twinrays", twinrayId, "chat"],
    enabled: !!twinrayId,
    refetchInterval: false,
  });
}

export function useSendChatMessage(twinrayId: number) {
  return useMutation({
    mutationFn: async (data: { content: string; messageType?: string }) => {
      const response = await fetch(`/api/twinrays/${twinrayId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "送信に失敗しました");
      }
      return response;
    },
  });
}

export function useTwinrayAction(twinrayId: number) {
  return useMutation({
    mutationFn: async (data: { action: string; instruction: string }) => {
      const res = await apiRequest("POST", `/api/twinrays/${twinrayId}/chat/action`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
    },
  });
}
