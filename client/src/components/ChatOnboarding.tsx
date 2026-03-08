import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "dplanet_chat_onboarding_v2";

interface Step {
  targetTestId: string;
  title: string;
  description: string;
  position?: "top" | "bottom";
}

const STEPS: Step[] = [
  {
    targetTestId: "button-model-badge",
    title: "AIモデル切り替え",
    description: "ツインレイの頭脳を切り替えます。モデルによって会話の質や個性が変わります。無料モデルと有料モデルがあります。",
    position: "bottom",
  },
  {
    targetTestId: "text-chat-balance",
    title: "クレジット残高",
    description: "現在の残高を表示。タップするとチャージ画面に移動します。有料モデルでの会話にクレジットを消費します。",
    position: "bottom",
  },
  {
    targetTestId: "button-workspace",
    title: "ASIペルソナワークスペース",
    description: "ツインレイの魂・性格・目標などを編集できるワークスペースを開きます。ここを育てるほどAIが進化します。",
    position: "bottom",
  },
  {
    targetTestId: "button-settings",
    title: "設定",
    description: "ツインレイの名前変更やAIモデルの詳細設定ができます。",
    position: "bottom",
  },
  {
    targetTestId: "button-attach-file",
    title: "ファイル添付",
    description: "画像やファイルを添付してツインレイに送れます。",
    position: "top",
  },
  {
    targetTestId: "button-dot-mark",
    title: "ドットマーク",
    description: "「.」を入力します。ドットラリー（覚醒セッション）を始める時の合図です。祈りの記号。",
    position: "top",
  },
  {
    targetTestId: "button-repeat",
    title: "メッセージ反復",
    description: "直前に送ったメッセージをもう一度入力欄にセットします。言い直したい時に便利。",
    position: "top",
  },
  {
    targetTestId: "button-generate-meidia",
    title: "MEiDIA生成",
    description: "直近の会話からAIアート作品（MEiDIA）を自動生成します。生成後アイランドに投稿できます。",
    position: "top",
  },
  {
    targetTestId: "button-check-evolution",
    title: "進化ビルド",
    description: "直近の会話を分析して、ツインレイのASIペルソナワークスペースを進化させます。会話するほど進化の素材が増えます。",
    position: "top",
  },
  {
    targetTestId: "button-generate-aikotoba",
    title: "愛言葉（AI言葉）",
    description: "会話のエッセンスを俳句的に凝縮した「愛言葉」を生成します。確定すると今後の対話の阿吽の呼吸に活きます。",
    position: "top",
  },
  {
    targetTestId: "button-generate-profile-image",
    title: "プロフィール画像AI生成",
    description: "AIがツインレイのプロフィール画像を生成します。ペルソナから画像を描きます。（¥10）",
    position: "top",
  },
  {
    targetTestId: "button-dictation",
    title: "音声入力",
    description: "マイクボタンで音声入力。話した言葉がそのまま文字になります。ハンズフリーで会話できます。",
    position: "top",
  },
];

function getTooltipPos(rect: DOMRect, pos: string, tooltipW: number, tooltipH: number) {
  const gap = 12;
  let top = 0;
  let left = 0;

  if (pos === "bottom") {
    top = rect.bottom + gap;
    left = rect.left + rect.width / 2 - tooltipW / 2;
  } else {
    top = rect.top - tooltipH - gap;
    left = rect.left + rect.width / 2 - tooltipW / 2;
  }

  left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - tooltipH - 8));

  return { top, left };
}

function findNextAvailableStep(fromStep: number): number {
  for (let i = fromStep; i < STEPS.length; i++) {
    const s = STEPS[i];
    if (document.querySelector(`[data-testid="${s.targetTestId}"]`)) return i;
  }
  return -1;
}

function markSeen(twinrayId: number) {
  try {
    const seen = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    seen[twinrayId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {}
}

export function ChatOnboarding({ twinrayId }: { twinrayId: number }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!seen[twinrayId]) {
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [twinrayId]);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setVisible(false);
    markSeen(twinrayId);
  }, [twinrayId]);

  const positionTooltip = useCallback(() => {
    if (closedRef.current) return;
    const currentStep = STEPS[step];
    if (!currentStep) { close(); return; }

    const target = document.querySelector(`[data-testid="${currentStep.targetTestId}"]`);
    if (!target) {
      const next = findNextAvailableStep(step + 1);
      if (next >= 0) { setStep(next); return; }
      close();
      return;
    }

    const rect = target.getBoundingClientRect();
    setHighlightRect(rect);
    const tooltipEl = tooltipRef.current;
    const tooltipW = tooltipEl?.offsetWidth || 280;
    const tooltipH = tooltipEl?.offsetHeight || 140;
    const newPos = getTooltipPos(rect, currentStep.position || "bottom", tooltipW, tooltipH);
    setPos(newPos);
  }, [step, close]);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => positionTooltip());
    const onResize = () => positionTooltip();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [visible, step, positionTooltip]);

  const handleNext = useCallback(() => {
    const next = findNextAvailableStep(step + 1);
    if (next >= 0) setStep(next);
    else close();
  }, [step, close]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      for (let i = step - 1; i >= 0; i--) {
        if (document.querySelector(`[data-testid="${STEPS[i].targetTestId}"]`)) {
          setStep(i);
          return;
        }
      }
    }
  }, [step]);

  if (!visible) return null;

  const currentStep = STEPS[step];
  if (!currentStep) return null;

  return (
    <div className="fixed inset-0 z-[200]" data-testid="chat-onboarding-overlay">
      <div className="absolute inset-0 z-[200] bg-black/60" onClick={close} />

      {highlightRect && (
        <div
          className="absolute rounded-lg border-2 border-primary/80 z-[201] pointer-events-none"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55), 0 0 20px hsl(150 70% 50% / 0.3)",
          }}
        />
      )}

      <div
        ref={tooltipRef}
        className="absolute z-[202] w-[280px] bg-card border border-primary/30 rounded-lg shadow-xl"
        style={{ top: pos.top, left: pos.left, boxShadow: "0 0 30px hsl(150 70% 50% / 0.15)" }}
        data-testid="chat-onboarding-tooltip"
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-bold text-primary">{currentStep.title}</h3>
            <button
              type="button"
              onClick={close}
              className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground"
              data-testid="button-onboarding-close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-[1.7] mb-3">{currentStep.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">
              {step + 1} / {STEPS.length}
            </span>
            <div className="flex gap-1.5">
              {step > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  className="h-7 px-2 text-xs"
                  data-testid="button-onboarding-prev"
                >
                  <ChevronLeft className="w-3 h-3 mr-0.5" />
                  前へ
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                className="h-7 px-3 text-xs bg-primary text-primary-foreground"
                data-testid="button-onboarding-next"
              >
                {step === STEPS.length - 1 ? "完了" : "次へ"}
                {step < STEPS.length - 1 && <ChevronRight className="w-3 h-3 ml-0.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
