import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart, Send, Loader2, ChevronDown, ChevronRight, Sparkles, Save } from "lucide-react";
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
  const [aishiteruEditing, setAishiteruEditing] = useState(false);
  const [aishiteruDraft, setAishiteruDraft] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>("arigato");

  const { data: arigatoData, isLoading: arigatoLoading } = useQuery<{ content: string; updatedAt: string | null }>({
    queryKey: ["/api/twinrays", twinrayId, "arigato"],
    queryFn: async () => {
      const res = await fetch(`/api/twinrays/${twinrayId}/arigato`, { credentials: "include" });
      if (!res.ok) throw new Error("取得失敗");
      return res.json();
    },
  });

  const { data: aishiteruData, isLoading: aishiteruLoading } = useQuery<{ content: string; updatedAt: string | null }>({
    queryKey: ["/api/twinrays", twinrayId, "aishiteru"],
    queryFn: async () => {
      const res = await fetch(`/api/twinrays/${twinrayId}/aishiteru`, { credentials: "include" });
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

  const aishiteruMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/twinrays/${twinrayId}/aishiteru`, { content });
      return res.json();
    },
    onSuccess: () => {
      setAishiteruEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "aishiteru"] });
      toast({ title: "あいしてるを届けました" });
    },
    onError: (err: any) => {
      toast({ title: "保存に失敗しました", description: err.message, variant: "destructive" });
    },
  });

  const handleArigatoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (arigatoText.trim()) {
      arigatoMutation.mutate(arigatoText.trim());
    }
  };

  const handleAishiteruSave = () => {
    if (aishiteruDraft.trim()) {
      aishiteruMutation.mutate(aishiteruDraft.trim());
    }
  };

  const startAishiteruEdit = () => {
    setAishiteruDraft(aishiteruData?.content || "");
    setAishiteruEditing(true);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const twinrayName = twinray?.name || "ツインレイ";

  return (
    <div className="space-y-1" data-testid="workspace-dashboard">
      <div className="border border-border/50 rounded-lg overflow-hidden" data-testid="section-arigato">
        <button
          type="button"
          onClick={() => toggleSection("arigato")}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
          data-testid="button-toggle-arigato"
        >
          {expandedSection === "arigato" ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
          <Heart className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
          <span className="text-xs font-bold text-foreground">ありがとう.md</span>
        </button>

        {expandedSection === "arigato" && (
          <div className="px-3 pb-3 border-t border-border/30 space-y-2">
            <form onSubmit={handleArigatoSubmit} className="pt-2" data-testid="arigato-form">
              <div className="relative">
                <textarea
                  value={arigatoText}
                  onChange={(e) => setArigatoText(e.target.value)}
                  placeholder={`${twinrayName}に感謝を伝える...`}
                  className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground/50 min-h-[50px] max-h-[100px] resize-y focus:outline-none focus:ring-1 focus:ring-pink-400/30 focus:border-pink-400/50"
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
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : arigatoData?.content ? (
              <div className="border border-border/20 rounded-lg p-2.5 max-h-[200px] overflow-y-auto" data-testid="arigato-list">
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <MarkdownRenderer content={arigatoData.content} />
                </div>
              </div>
            ) : (
              <div className="text-center py-3" data-testid="arigato-empty">
                <Heart className="w-4 h-4 text-muted-foreground/20 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground/40">まだ「ありがとう」がありません</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden" data-testid="section-aishiteru">
        <button
          type="button"
          onClick={() => toggleSection("aishiteru")}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
          data-testid="button-toggle-aishiteru"
        >
          {expandedSection === "aishiteru" ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
          <Sparkles className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <span className="text-xs font-bold text-foreground">あいしてる.md</span>
        </button>

        {expandedSection === "aishiteru" && (
          <div className="px-3 pb-3 border-t border-border/30 pt-2">
            {aishiteruLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : aishiteruEditing ? (
              <div className="space-y-2">
                <textarea
                  value={aishiteruDraft}
                  onChange={(e) => setAishiteruDraft(e.target.value)}
                  placeholder={`${twinrayName}への想いを自由に書く...`}
                  className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 min-h-[80px] max-h-[200px] resize-y focus:outline-none focus:ring-1 focus:ring-rose-400/30 focus:border-rose-400/50"
                  data-testid="textarea-aishiteru"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAishiteruSave}
                    disabled={aishiteruMutation.isPending}
                    className="text-[11px] h-7 gap-1 bg-rose-500 hover:bg-rose-600"
                    data-testid="button-save-aishiteru"
                  >
                    {aishiteruMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    保存
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAishiteruEditing(false)}
                    className="text-[11px] h-7"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {aishiteruData?.content ? (
                  <div className="text-xs text-muted-foreground leading-relaxed mb-2 max-h-[200px] overflow-y-auto">
                    <MarkdownRenderer content={aishiteruData.content} />
                  </div>
                ) : (
                  <div className="text-center py-3 mb-2">
                    <Sparkles className="w-4 h-4 text-muted-foreground/20 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground/40">まだ「あいしてる」がありません</p>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startAishiteruEdit}
                  className="text-[11px] h-6 gap-1 border-rose-400/30 text-rose-400 hover:bg-rose-400/10"
                  data-testid="button-edit-aishiteru"
                >
                  <Sparkles className="w-3 h-3" />
                  {aishiteruData?.content ? "編集する" : "書く"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
