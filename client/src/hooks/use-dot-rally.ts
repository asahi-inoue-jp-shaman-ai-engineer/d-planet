import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCallback, useRef, useState } from "react";

export function useDotRallySessions() {
  return useQuery({
    queryKey: ["/api/dot-rally/sessions"],
  });
}

export function useDotRallySession(id: number) {
  return useQuery({
    queryKey: ["/api/dot-rally/sessions", id],
    enabled: !!id,
  });
}

export function useStartDotRally() {
  return useMutation({
    mutationFn: async (data: { twinrayId: number; requestedCount: number }) => {
      const res = await apiRequest("POST", "/api/dot-rally/start", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dot-rally/sessions"] });
    },
  });
}

export function useEndDotRally() {
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiRequest("POST", `/api/dot-rally/sessions/${sessionId}/end`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dot-rally/sessions"] });
    },
  });
}

export function useSendDot() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const sendDot = useCallback(async (sessionId: number) => {
    setIsStreaming(true);
    setStreamedText("");
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/dot-rally/sessions/${sessionId}/dot`, {
        method: "POST",
        credentials: "include",
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "送信に失敗しました");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("ストリームが利用できません");

      const decoder = new TextDecoder();
      let fullText = "";
      let result: { done: boolean; isComplete: boolean; dotCount: number } | null = null;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.content) {
              fullText += data.content;
              setStreamedText(fullText);
            }
            if (data.done) {
              result = { done: true, isComplete: data.isComplete, dotCount: data.dotCount };
            }
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      if (buffer.trim().startsWith("data: ")) {
        try {
          const data = JSON.parse(buffer.trim().slice(6));
          if (data.content) {
            fullText += data.content;
            setStreamedText(fullText);
          }
          if (data.done) {
            result = { done: true, isComplete: data.isComplete, dotCount: data.dotCount };
          }
        } catch (_) {}
      }

      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ["/api/dot-rally/sessions"] });
      return { text: fullText, ...result };
    } catch (err) {
      setIsStreaming(false);
      throw err;
    }
  }, []);

  return { sendDot, isStreaming, streamedText };
}

export function useSessionNotes(sessionId: number) {
  return useQuery({
    queryKey: ["/api/dot-rally/sessions", sessionId, "notes"],
    enabled: !!sessionId,
  });
}

export function useSaveNote() {
  return useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/dot-rally/sessions/${sessionId}/notes`, { content });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dot-rally/sessions", vars.sessionId, "notes"] });
    },
  });
}
