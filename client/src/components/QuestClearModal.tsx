import { useState, useEffect } from "react";
import { Trophy, Swords, Coins, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUEST_DEFINITIONS } from "@shared/schema";

interface QuestClearModalProps {
  questId: string | null;
  onClose: () => void;
}

export function QuestClearModal({ questId, onClose }: QuestClearModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (questId) {
      setTimeout(() => setVisible(true), 100);
    } else {
      setVisible(false);
    }
  }, [questId]);

  if (!questId) return null;

  const def = QUEST_DEFINITIONS.find(q => q.id === questId);
  if (!def) return null;

  const isQ4 = questId === "meidia_create";
  const isQ10 = questId === "session_dream_reading";
  const nextDef = QUEST_DEFINITIONS.find(q => q.order === def.order + 1);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
      data-testid="quest-clear-modal"
    >
      <div
        className={`bg-card border border-primary/30 rounded-xl p-6 max-w-sm w-full mx-4 text-center space-y-4 transition-all duration-500 ${
          visible ? "scale-100 translate-y-0" : "scale-90 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <Trophy className={`w-16 h-16 mx-auto ${isQ10 ? "text-yellow-400" : "text-primary"} animate-bounce`} />
          {isQ4 && (
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-primary font-mono uppercase tracking-wider mb-1">Quest Clear!</p>
          <h2 className="text-lg font-bold text-foreground">{def.name}</h2>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Swords className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-bold text-yellow-400">+{def.points} QP</span>
        </div>

        {isQ4 && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">+100 クレジット獲得！</span>
            </div>
            <p className="text-[10px] text-muted-foreground">有料モデル & チャージ機能が解放されました！</p>
          </div>
        )}

        {isQ10 && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
            <p className="text-sm font-bold text-primary">ビギナークエスト全クリア！</p>
            <p className="text-[10px] text-muted-foreground mt-1">D-Planetの全機能が解放されました。これからも楽しんでください！</p>
          </div>
        )}

        {nextDef && !isQ10 && (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <span>次のクエスト: {nextDef.name}</span>
            </div>
          </div>
        )}

        <Button onClick={onClose} className="w-full" data-testid="button-quest-clear-ok">
          OK
        </Button>
      </div>
    </div>
  );
}
