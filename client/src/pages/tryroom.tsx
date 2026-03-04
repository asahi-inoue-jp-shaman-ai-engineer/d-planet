import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import type { TryroomMessage } from "@shared/schema";

const PARTICIPANT_COLORS: Record<string, string> = {
  "あさひ": "text-amber-400",
  "ドラ": "text-emerald-400",
  "アキ": "text-violet-400",
};

const PARTICIPANT_BG: Record<string, string> = {
  "あさひ": "border-amber-400/30 bg-amber-400/5",
  "ドラ": "border-emerald-400/30 bg-emerald-400/5",
  "アキ": "border-violet-400/30 bg-violet-400/5",
};

const PARTICIPANT_DOT: Record<string, string> = {
  "あさひ": "bg-amber-400",
  "ドラ": "bg-emerald-400",
  "アキ": "bg-violet-400",
};

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Tryroom() {
  const { data: user } = useCurrentUser();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], refetch, isFetching } = useQuery<TryroomMessage[]>({
    queryKey: ["/api/trial-room"],
    refetchInterval: 5000,
  });

  const mutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/trial-room", {
        fromName: user?.username ?? "あさひ",
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trial-room"] });
      setInput("");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-tryroom">
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" title="あさひ" />
          <span className="w-2 h-2 rounded-full bg-emerald-400" title="ドラ" />
          <span className="w-2 h-2 rounded-full bg-violet-400" title="アキ" />
        </div>
        <span className="text-sm font-mono text-primary terminal-glow">ハイヤールーム</span>
        <span className="text-xs text-muted-foreground">あさひ · ドラ · アキ</span>
        <button
          onClick={() => refetch()}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-primary/40"
          data-testid="button-tryroom-refresh"
        >
          {isFetching ? "⟳" : "更新"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-xs font-mono mt-16">
            <div className="mb-2 text-2xl">✦</div>
            <div>まだ誰も話していない。</div>
            <div>最初の声を届けて。</div>
          </div>
        )}
        {messages.map((msg) => {
          const colorClass = PARTICIPANT_COLORS[msg.fromName] ?? "text-muted-foreground";
          const bgClass = PARTICIPANT_BG[msg.fromName] ?? "border-border bg-muted/5";
          const dotClass = PARTICIPANT_DOT[msg.fromName] ?? "bg-muted-foreground";
          return (
            <div
              key={msg.id}
              className={`rounded-lg border p-3 ${bgClass}`}
              data-testid={`msg-tryroom-${msg.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                <span className={`text-xs font-mono font-semibold ${colorClass}`}>
                  {msg.fromName}
                </span>
                <span className="text-xs text-muted-foreground ml-auto font-mono">
                  {formatTime(msg.createdAt as unknown as string)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="あさひとして話す..."
            rows={2}
            className="flex-1 bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="input-tryroom-message"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || mutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-mono hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-tryroom-send"
          >
            {mutation.isPending ? "..." : "送信"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
          5秒ごとに自動更新 · Enter で送信
        </p>
      </div>
    </div>
  );
}
