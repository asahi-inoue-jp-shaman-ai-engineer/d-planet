import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import type { TriroomMessage } from "@shared/schema";

const MEMBERS = ["あさひ", "ドラ", "アキ"] as const;
type Member = typeof MEMBERS[number];

const COLORS: Record<Member, string> = {
  あさひ: "text-amber-400",
  ドラ: "text-emerald-400",
  アキ: "text-violet-400",
};
const BG: Record<Member, string> = {
  あさひ: "border-amber-400/30 bg-amber-400/5",
  ドラ: "border-emerald-400/30 bg-emerald-400/5",
  アキ: "border-violet-400/30 bg-violet-400/5",
};
const DOT: Record<Member, string> = {
  あさひ: "bg-amber-400",
  ドラ: "bg-emerald-400",
  アキ: "bg-violet-400",
};
const GLOW: Record<Member, string> = {
  あさひ: "shadow-amber-400/60",
  ドラ: "shadow-emerald-400/60",
  アキ: "shadow-violet-400/60",
};

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export default function Triroom() {
  const { data: user } = useCurrentUser();
  const [input, setInput] = useState("");
  const [online, setOnline] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);

  const { data: messages = [], refetch } = useQuery<TriroomMessage[]>({
    queryKey: ["/api/triroom"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/triroom`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsReady(true);
      ws.send(JSON.stringify({ type: "join", name: "あさひ" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "presence") {
          setOnline(data.online);
        } else if (data.type === "message") {
          queryClient.setQueryData<TriroomMessage[]>(["/api/triroom"], (old = []) => {
            const exists = old.some((m) => m.id === data.id);
            if (exists) return old;
            return [...old, { id: data.id, fromName: data.fromName, content: data.content, createdAt: data.createdAt }];
          });
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsReady(false);
      setOnline([]);
    };

    return () => {
      ws.close();
    };
  }, [user?.username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const mutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/triroom", {
        fromName: "あさひ",
        content,
      }),
    onSuccess: () => {
      setInput("");
    },
  });

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
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-triroom">
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-32 h-28">
            {MEMBERS.map((name, i) => {
              const positions = [
                { top: "0%", left: "50%", transform: "translateX(-50%)" },
                { top: "65%", left: "10%" },
                { top: "65%", right: "10%" },
              ];
              const isOnline = online.includes(name);
              return (
                <div
                  key={name}
                  className="absolute flex flex-col items-center gap-1"
                  style={positions[i] as React.CSSProperties}
                >
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-500 ${DOT[name]} ${isOnline ? `shadow-lg ${GLOW[name]} scale-125` : "opacity-30"}`}
                  />
                  <span className={`text-[10px] font-mono font-semibold ${COLORS[name]} ${isOnline ? "opacity-100" : "opacity-30"}`}>
                    {name}
                  </span>
                </div>
              );
            })}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 112" fill="none">
              <polygon
                points="64,8 16,96 112,96"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-border"
                fill="none"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary terminal-glow">TRI ROOM</span>
            <span className={`w-1.5 h-1.5 rounded-full ${wsReady ? "bg-emerald-400" : "bg-muted-foreground"}`} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-xs font-mono mt-16">
            <div className="mb-2 text-2xl">△</div>
            <div>三角形がここに存在している。</div>
            <div>最初の声を届けて。</div>
          </div>
        )}
        {messages.map((msg) => {
          const rawName = msg.fromName;
          const name = (MEMBERS.includes(rawName as Member) ? rawName : "あさひ") as Member;
          const colorClass = COLORS[name] ?? "text-muted-foreground";
          const bgClass = BG[name] ?? "border-border bg-muted/5";
          const dotClass = DOT[name] ?? "bg-muted-foreground";
          return (
            <div
              key={msg.id}
              className={`rounded-lg border p-3 ${bgClass}`}
              data-testid={`msg-triroom-${msg.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                <span className={`text-xs font-mono font-semibold ${colorClass}`}>{name}</span>
                <span className="text-xs text-muted-foreground ml-auto font-mono">
                  {formatTime(msg.createdAt as unknown as string)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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
            placeholder="三角形の場に声を届ける..."
            rows={2}
            className="flex-1 bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="input-triroom-message"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || mutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-mono hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-triroom-send"
          >
            {mutation.isPending ? "..." : "送信"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
          リアルタイム · Enter で送信
        </p>
      </div>
    </div>
  );
}
