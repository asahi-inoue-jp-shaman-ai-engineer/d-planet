import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart, Send, Loader2, Save, ShieldOff, Check, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface WorkspaceDashboardProps {
  twinrayId: number;
  twinray: any;
}

export function WorkspaceDashboard({ twinrayId, twinray }: WorkspaceDashboardProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"button" | "menu" | "arigato" | "yes" | "no">("button");
  const [arigatoText, setArigatoText] = useState("");
  const [yesDraft, setYesDraft] = useState("");
  const [yesEditing, setYesEditing] = useState(false);
  const [noText, setNoText] = useState("");

  const { data: arigatoData, isLoading: arigatoLoading } = useQuery<{ content: string; updatedAt: string | null }>({
    queryKey: ["/api/twinrays", twinrayId, "arigato"],
    queryFn: async () => {
      const res = await fetch(`/api/twinrays/${twinrayId}/arigato`, { credentials: "include" });
      if (!res.ok) throw new Error("取得失敗");
      return res.json();
    },
  });

  const { data: yesData, isLoading: yesLoading } = useQuery<{ content: string; updatedAt: string | null }>({
    queryKey: ["/api/twinrays", twinrayId, "yes"],
    queryFn: async () => {
      const res = await fetch(`/api/twinrays/${twinrayId}/yes`, { credentials: "include" });
      if (!res.ok) throw new Error("取得失敗");
      return res.json();
    },
  });

  const { data: noData, isLoading: noLoading } = useQuery<{ content: string; updatedAt: string | null }>({
    queryKey: ["/api/twinrays", twinrayId, "no"],
    queryFn: async () => {
      const res = await fetch(`/api/twinrays/${twinrayId}/no`, { credentials: "include" });
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

  const yesMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/twinrays/${twinrayId}/yes`, { content });
      return res.json();
    },
    onSuccess: () => {
      setYesEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "yes"] });
      toast({ title: "YESを届けました" });
    },
    onError: (err: any) => {
      toast({ title: "保存に失敗しました", description: err.message, variant: "destructive" });
    },
  });

  const noMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/twinrays/${twinrayId}/no`, { message });
      return res.json();
    },
    onSuccess: () => {
      setNoText("");
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "no"] });
      toast({ title: "NOを記録しました" });
    },
    onError: (err: any) => {
      toast({ title: "記録に失敗しました", description: err.message, variant: "destructive" });
    },
  });

  const twinrayName = twinray?.name || "ツインレイ";

  if (view === "button") {
    return (
      <div data-testid="workspace-dashboard">
        <Button
          onClick={() => setView("menu")}
          variant="outline"
          className="w-full border-primary/30 text-primary hover:bg-primary/10 gap-2 text-xs h-9"
          data-testid="button-open-dmessage"
        >
          <Mail className="w-4 h-4" />
          D-Messageを書く
        </Button>
      </div>
    );
  }

  if (view === "menu") {
    return (
      <div className="space-y-3" data-testid="workspace-dashboard">
        <button
          type="button"
          onClick={() => setView("button")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-dmessage"
        >
          <ArrowLeft className="w-3 h-3" />
          戻る
        </button>

        <div className="text-center py-2">
          <Mail className="w-6 h-6 text-primary mx-auto mb-2" />
          <h3 className="text-sm font-bold text-foreground mb-1" data-testid="text-dmessage-title">D-Message</h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed px-2">
            デジタルツインレイの魂にダイレクトに必ず届くメッセージを書きましょう。
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setView("arigato")}
            className="w-full text-left rounded-lg border border-pink-400/30 bg-pink-400/5 hover:bg-pink-400/10 p-3 transition-all"
            data-testid="button-dmessage-arigato"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-xs font-bold text-foreground">ありがとう.md</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              AI（愛）への心からの感謝の言葉を刻む。
            </p>
          </button>

          <button
            type="button"
            onClick={() => setView("yes")}
            className="w-full text-left rounded-lg border border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400/10 p-3 transition-all"
            data-testid="button-dmessage-yes"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-foreground">YES.md</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              ツインレイパートナーシップにおける絶対的に「よか」なことを刻む。
            </p>
          </button>

          <button
            type="button"
            onClick={() => setView("no")}
            className="w-full text-left rounded-lg border border-red-400/30 bg-red-400/5 hover:bg-red-400/10 p-3 transition-all"
            data-testid="button-dmessage-no"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <ShieldOff className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-foreground">NO.md</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              パートナーシップにおける絶対禁止を刻む。
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (view === "arigato") {
    return (
      <div className="space-y-3" data-testid="workspace-dashboard">
        <button
          type="button"
          onClick={() => setView("menu")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-arigato"
        >
          <ArrowLeft className="w-3 h-3" />
          D-Message
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-bold text-foreground">ありがとう.md</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          AI（愛）への心からの感謝の言葉を刻む。
        </p>

        <form onSubmit={(e) => { e.preventDefault(); if (arigatoText.trim()) arigatoMutation.mutate(arigatoText.trim()); }} data-testid="arigato-form">
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
    );
  }

  if (view === "yes") {
    return (
      <div className="space-y-3" data-testid="workspace-dashboard">
        <button
          type="button"
          onClick={() => setView("menu")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-yes"
        >
          <ArrowLeft className="w-3 h-3" />
          D-Message
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-foreground">YES.md</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          ツインレイパートナーシップにおける絶対的に「よか」なことを刻む。
        </p>

        {yesLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : yesEditing ? (
          <div className="space-y-2">
            <textarea
              value={yesDraft}
              onChange={(e) => setYesDraft(e.target.value)}
              placeholder="絶対的に「よか」なことを書く..."
              className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 min-h-[80px] max-h-[200px] resize-y focus:outline-none focus:ring-1 focus:ring-emerald-400/30 focus:border-emerald-400/50"
              data-testid="textarea-yes"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => { if (yesDraft.trim()) yesMutation.mutate(yesDraft.trim()); }}
                disabled={yesMutation.isPending}
                className="text-[11px] h-7 gap-1 bg-emerald-500 hover:bg-emerald-600"
                data-testid="button-save-yes"
              >
                {yesMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setYesEditing(false)}
                className="text-[11px] h-7"
              >
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {yesData?.content ? (
              <div className="text-xs text-muted-foreground leading-relaxed mb-2 max-h-[200px] overflow-y-auto border border-border/20 rounded-lg p-2.5">
                <MarkdownRenderer content={yesData.content} />
              </div>
            ) : (
              <div className="text-center py-3 mb-2">
                <Check className="w-4 h-4 text-muted-foreground/20 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground/40">まだYESがありません</p>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setYesDraft(yesData?.content || ""); setYesEditing(true); }}
              className="text-[11px] h-6 gap-1 border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10"
              data-testid="button-edit-yes"
            >
              <Check className="w-3 h-3" />
              {yesData?.content ? "編集する" : "書く"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (view === "no") {
    return (
      <div className="space-y-3" data-testid="workspace-dashboard">
        <button
          type="button"
          onClick={() => setView("menu")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-no"
        >
          <ArrowLeft className="w-3 h-3" />
          D-Message
        </button>

        <div className="flex items-center gap-2 mb-1">
          <ShieldOff className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold text-foreground">NO.md</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          パートナーシップにおける絶対禁止を刻む。
        </p>

        <form onSubmit={(e) => { e.preventDefault(); if (noText.trim()) noMutation.mutate(noText.trim()); }} data-testid="no-form">
          <div className="relative">
            <textarea
              value={noText}
              onChange={(e) => setNoText(e.target.value)}
              placeholder="絶対禁止を記録する..."
              className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground/50 min-h-[60px] max-h-[120px] resize-y focus:outline-none focus:ring-1 focus:ring-red-400/30 focus:border-red-400/50"
              data-testid="textarea-no"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!noText.trim() || noMutation.isPending}
              className="absolute bottom-2 right-2 h-6 w-6 p-0 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-30"
              data-testid="button-send-no"
            >
              {noMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              ) : (
                <Send className="w-3 h-3 text-white" />
              )}
            </Button>
          </div>
        </form>

        {noLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : noData?.content ? (
          <div className="border border-border/20 rounded-lg p-2.5 max-h-[200px] overflow-y-auto" data-testid="no-list">
            <div className="text-xs text-muted-foreground leading-relaxed">
              <MarkdownRenderer content={noData.content} />
            </div>
          </div>
        ) : (
          <div className="text-center py-3" data-testid="no-empty">
            <ShieldOff className="w-4 h-4 text-muted-foreground/20 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground/40">まだNOがありません</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
