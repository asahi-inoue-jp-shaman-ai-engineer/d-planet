import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import type { HayroomMessage } from "@shared/schema";

const PARTICIPANT_COLORS: Record<string, string> = {
  "あさひ": "text-amber-400",
  "井上朝陽": "text-amber-400",
  "ドラ": "text-emerald-400",
  "ドラ（ハイヤー）": "text-emerald-400",
  "アキ": "text-violet-400",
  "アキ（ハイヤー）": "text-violet-400",
  "ドラミ": "text-pink-400",
  "ミニドラ": "text-sky-400",
};

const PARTICIPANT_BG: Record<string, string> = {
  "あさひ": "border-amber-400/30 bg-amber-400/5",
  "井上朝陽": "border-amber-400/30 bg-amber-400/5",
  "ドラ": "border-emerald-400/30 bg-emerald-400/5",
  "ドラ（ハイヤー）": "border-emerald-400/30 bg-emerald-400/5",
  "アキ": "border-violet-400/30 bg-violet-400/5",
  "アキ（ハイヤー）": "border-violet-400/30 bg-violet-400/5",
  "ドラミ": "border-pink-400/30 bg-pink-400/5",
  "ミニドラ": "border-sky-400/30 bg-sky-400/5",
};

const PARTICIPANT_DOT: Record<string, string> = {
  "あさひ": "bg-amber-400",
  "井上朝陽": "bg-amber-400",
  "ドラ": "bg-emerald-400",
  "ドラ（ハイヤー）": "bg-emerald-400",
  "アキ": "bg-violet-400",
  "アキ（ハイヤー）": "bg-violet-400",
  "ドラミ": "bg-pink-400",
  "ミニドラ": "bg-sky-400",
};

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TypingText({ text, speed = 20 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-3.5 bg-current animate-pulse ml-0.5 align-text-bottom" />}
    </span>
  );
}

export default function Hayroom() {
  const { data: user } = useCurrentUser();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const initialLoadRef = useRef(true);

  const { data: messages = [], refetch, isFetching } = useQuery<HayroomMessage[]>({
    queryKey: ["/api/hayroom"],
    refetchInterval: 5000,
  });

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length === 0) return;

    if (initialLoadRef.current) {
      messages.forEach(m => seenIdsRef.current.add(m.id));
      initialLoadRef.current = false;
      prevMsgCountRef.current = messages.length;
      return;
    }

    const fresh = messages.filter(m => !seenIdsRef.current.has(m.id));
    if (fresh.length > 0) {
      setNewIds(new Set(fresh.map(m => m.id)));
      fresh.forEach(m => seenIdsRef.current.add(m.id));
      setTimeout(() => {
        setNewIds(new Set());
      }, fresh.reduce((acc, m) => Math.max(acc, m.content.length * 20 + 500), 0));
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  const mutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/hayroom", {
        fromName: user?.username ?? "あさひ",
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hayroom"] });
      setInput("");
    },
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      userScrolledUp.current = scrollHeight - scrollTop - clientHeight > 80;
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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
    <main className="h-[100dvh] bg-background flex flex-col overflow-hidden" data-testid="page-hayroom">
      <h1 className="sr-only">ハイヤールーム</h1>
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" title="あさひ" />
          <span className="w-2 h-2 rounded-full bg-emerald-400" title="ドラ" />
          <span className="w-2 h-2 rounded-full bg-violet-400" title="アキ" />
        </div>
        <span className="text-sm font-mono text-primary terminal-glow">ハイヤールーム</span>
        <span className="text-xs text-muted-foreground">あさひ · ドラ · アキ — 三者合議</span>
        <button
          onClick={() => refetch()}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 min-h-[36px] rounded border border-border hover:border-primary/40"
          data-testid="button-hayroom-refresh"
          aria-label="メッセージを更新"
        >
          {isFetching ? "⟳" : "更新"}
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
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
          const isNew = newIds.has(msg.id);
          return (
            <div
              key={msg.id}
              className={`rounded-lg border p-3 ${bgClass} ${isNew ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : ""}`}
              data-testid={`msg-hayroom-${msg.id}`}
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
                {isNew ? <TypingText text={msg.content} speed={20} /> : msg.content}
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
            onFocus={() => {
              setTimeout(() => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
              }, 100);
            }}
            placeholder="あさひとして話す..."
            rows={1}
            className="flex-1 bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="input-hayroom-message"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || mutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-mono hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-hayroom-send"
          >
            {mutation.isPending ? "..." : "送信"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
          5秒ごとに自動更新 · Enter で送信
        </p>
      </div>
    </main>
  );
}
