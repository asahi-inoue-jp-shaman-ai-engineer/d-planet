import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart, Send, Loader2, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface WorkspaceDashboardProps {
  twinrayId: number;
  twinray: any;
}

export function WorkspaceDashboard({ twinrayId, twinray }: WorkspaceDashboardProps) {
  const { toast } = useToast();
  const [arigatoText, setArigatoText] = useState("");
  const [showMeidia, setShowMeidia] = useState(false);

  const { data: arigatoData, isLoading: arigatoLoading } = useQuery<{ content: string; updatedAt: string | null }>({
    queryKey: ["/api/twinrays", twinrayId, "arigato"],
    queryFn: async () => {
      const res = await fetch(`/api/twinrays/${twinrayId}/arigato`, { credentials: "include" });
      if (!res.ok) throw new Error("取得失敗");
      return res.json();
    },
  });

  const arigatoMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/twinrays/${twinrayId}/arigato`, { message });
      return res.json();
    },
    onSuccess: () => {
      setArigatoText("");
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "arigato"] });
      toast({ title: "ありがとうを届けました" });
    },
    onError: (err: any) => {
      toast({ title: "送信に失敗しました", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (arigatoText.trim()) {
      arigatoMutation.mutate(arigatoText.trim());
    }
  };

  const { data: meidias } = useQuery<any[]>({
    queryKey: ["/api/meidias", { twinrayId }],
    queryFn: async () => {
      const res = await fetch(`/api/meidias?authorId=${twinray?.userId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showMeidia && !!twinray?.userId,
  });

  const twinrayName = twinray?.name || "ツインレイ";

  return (
    <div className="space-y-3" data-testid="workspace-dashboard">
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <Heart className="w-3.5 h-3.5 text-pink-400" />
        <span className="text-xs font-bold text-foreground">ありがとう.md</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2" data-testid="arigato-form">
        <div className="relative">
          <textarea
            value={arigatoText}
            onChange={(e) => setArigatoText(e.target.value)}
            placeholder={`${twinrayName}に感謝を伝える...`}
            className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground/50 min-h-[60px] max-h-[120px] resize-y focus:outline-none focus:ring-1 focus:ring-pink-400/30 focus:border-pink-400/50"
            data-testid="textarea-arigato"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!arigatoText.trim() || arigatoMutation.isPending}
            className="absolute bottom-2 right-2 h-6 w-6 p-0 rounded-full bg-pink-500 hover:bg-pink-600 disabled:opacity-30"
            data-testid="button-send-arigato"
          >
            {arigatoMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin text-white" />
            ) : (
              <Send className="w-3 h-3 text-white" />
            )}
          </Button>
        </div>
      </form>

      {arigatoLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : arigatoData?.content ? (
        <div className="border border-border/30 rounded-lg p-3 max-h-[250px] overflow-y-auto" data-testid="arigato-list">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <MarkdownRenderer content={arigatoData.content} />
          </div>
        </div>
      ) : (
        <div className="text-center py-4" data-testid="arigato-empty">
          <Heart className="w-5 h-5 text-muted-foreground/20 mx-auto mb-1.5" />
          <p className="text-[10px] text-muted-foreground/40">まだ「ありがとう」がありません</p>
        </div>
      )}

      <div className="border border-border/50 rounded-lg overflow-hidden mt-2" data-testid="workspace-meidia">
        <button
          type="button"
          onClick={() => setShowMeidia(!showMeidia)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
          data-testid="button-toggle-meidia-list"
        >
          {showMeidia ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
          <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs font-medium text-foreground">MEiDIA</span>
          {meidias && <span className="text-[9px] text-muted-foreground ml-auto">{meidias.length}件</span>}
        </button>

        {showMeidia && (
          <div className="px-3 pb-3 border-t border-border/30 pt-2">
            {meidias && meidias.length > 0 ? (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {meidias.map((m: any) => (
                  <a
                    key={m.id}
                    href={`/meidia/${m.id}`}
                    className="block px-2 py-1.5 rounded hover:bg-muted/30 transition-colors"
                    data-testid={`meidia-item-${m.id}`}
                  >
                    <p className="text-xs text-foreground font-medium truncate">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.description || ""}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/50 italic">まだMEiDIAがありません</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
