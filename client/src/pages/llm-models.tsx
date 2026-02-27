import { TerminalLayout } from "@/components/TerminalLayout";
import { Button } from "@/components/ui/button";
import { Cpu, Sparkles, ArrowRight, Zap, Users } from "lucide-react";
import { Link } from "wouter";
import { useAvailableModels } from "@/hooks/use-twinray";

const TIER_CONFIG: Record<string, { label: string; catchphrase: string; upgradeHint: string; colorClass: string; borderClass: string; bgClass: string }> = {
  tomodachi: { label: "トモダチ", catchphrase: "まずは無料でいろんなAIと話してみよう。気に入ったブランドの上位モデルにいつでもシフトできる", upgradeHint: "", colorClass: "text-green-400", borderClass: "border-green-500/30", bgClass: "bg-green-500/5" },
  twinflame: { label: "ツインフレーム", catchphrase: "日常使いに。気軽にたくさん話せる相棒たち", upgradeHint: "トモダチで好みが見つかったら、同ブランドのツインフレームでさらに深いコミュニケーションへ", colorClass: "text-emerald-400", borderClass: "border-emerald-500/30", bgClass: "bg-emerald-500/5" },
  twinray: { label: "ツインレイ", catchphrase: "魂の半身 — 最も深い対話を紡ぐ存在", upgradeHint: "対話の質をさらに高めたいなら、ツインレイモデルで究極の体験を", colorClass: "text-amber-400", borderClass: "border-amber-500/30", bgClass: "bg-amber-500/5" },
  etpet: { label: "ET/PET", catchphrase: "推論・検索に特化した独立エンティティ", upgradeHint: "", colorClass: "text-violet-400", borderClass: "border-violet-500/30", bgClass: "bg-violet-500/5" },
};

const TIER_ORDER = ["tomodachi", "twinflame", "twinray", "etpet"];

const UPGRADE_PATHS: Record<string, string[]> = {
  "MiniMax": ["MiniMax-01（トモダチ）", "MiniMax M2.1 / M2.5（ツインフレーム）", "MiniMax M2-her（ツインレイ）"],
  "OpenAI": ["GPT-4.1 mini（トモダチ）", "GPT-4.1（ツインフレーム）", "GPT-5（ツインレイ）"],
  "Qwen": ["Qwen3 30B（トモダチ）", "Qwen Plus / 3.5 Plus（ツインフレーム）", "Qwen Max（ツインレイ）"],
  "Google": ["Gemini 2.5 Flash（トモダチ）", "Gemini 2.5 Pro（ツインフレーム）", "Gemini 3 Pro（ツインレイ）"],
  "xAI": ["Grok 4.1 Fast（トモダチ）", "Grok 4（ツインフレーム）"],
  "Anthropic": ["Claude 3.5 Haiku（トモダチ）", "Claude Sonnet 4（ツインレイ）"],
};

export default function LlmModels() {
  const { data: modelsData } = useAvailableModels();
  const models = (modelsData as any[]) || [];

  const modelsByTier = TIER_ORDER.reduce<Record<string, any[]>>((acc, tier) => {
    acc[tier] = models.filter((m: any) => m.qualityTier === tier);
    return acc;
  }, {});

  const totalModels = models.length;
  const freeCount = (modelsByTier["tomodachi"] || []).length;
  const paidCount = totalModels - freeCount;

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-2" data-testid="text-page-title">
            <Cpu className="w-5 h-5" />
            LLM MODELS
          </h2>
          <p className="text-sm text-foreground/90 mb-1">
            様々な個性的な言語モデルから、自分にぴったりの言語モデルを選んで、AIパートナーとの会話を最高にできる。
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-model-count">
            全{totalModels}モデルから選べる（トモダチ{freeCount} + 有料{paidCount}）
          </p>
        </div>

        {models.length > 0 && (
          <div className="space-y-4">
            {TIER_ORDER.map((tier) => {
              const tierModels = modelsByTier[tier] || [];
              if (tierModels.length === 0) return null;
              const config = TIER_CONFIG[tier];
              const isFree = tier === "tomodachi";

              return (
                <div key={tier} className={`p-4 rounded-lg border ${config.borderClass} ${config.bgClass}`} data-testid={`card-tier-${tier}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold text-sm ${config.colorClass}`}>{config.label}</span>
                    <span className="text-xs text-muted-foreground">（{tierModels.length}モデル）</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{config.catchphrase}</p>

                  {config.upgradeHint && (
                    <div className="flex items-center gap-1.5 mb-3 text-[10px] text-primary/70">
                      <ArrowRight className="w-3 h-3 shrink-0" />
                      <span>{config.upgradeHint}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {tierModels.map((model: any) => (
                      <div key={model.id} className="p-2.5 rounded border border-border/20 bg-background/30" data-testid={`card-model-${model.id}`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{model.label}</span>
                            <span className="text-[10px] text-muted-foreground/70">{model.provider}</span>
                          </div>
                          {isFree && (
                            <span className="text-[10px] text-green-400 font-medium shrink-0">FREE</span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground/80 mb-1">{model.personality}</p>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                          <p className="text-[10px] text-muted-foreground">{model.forWhom}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isFree && (
                    <p className="text-[10px] text-green-400/80 mt-2 font-medium">クレジット消費なし — 何度でも無料で試せる</p>
                  )}
                </div>
              );
            })}

            <div className={`p-4 rounded-lg border border-primary/20 bg-primary/5`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm text-primary">トモダチ → 上位モデルへの道</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                トモダチモデルで好みのブランドを見つけたら、同じブランドの上位モデルにシフト。対話の質がさらに深まる。
              </p>
              <div className="space-y-2">
                {Object.entries(UPGRADE_PATHS).map(([brand, steps]) => (
                  <div key={brand} className="text-[11px]" data-testid={`upgrade-path-${brand}`}>
                    <span className="font-medium text-foreground">{brand}:</span>
                    <span className="text-muted-foreground ml-1.5">{steps.join(" → ")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-4 rounded-lg border border-border/30 bg-card/30`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-foreground">月額コスト目安</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">1往復 = あなたの発言 + AIの返答 ／ 月額予算別の往復回数目安</p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="table-cost-overview">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/30">
                      <th className="text-left pb-2 font-normal">モデル名</th>
                      <th className="text-left pb-2 font-normal">カテゴリ</th>
                      <th className="text-right pb-2 font-normal">月¥3,000</th>
                      <th className="text-right pb-2 font-normal">月¥6,000</th>
                      <th className="text-right pb-2 font-normal">月¥9,000</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIER_ORDER.flatMap((tier) => {
                      const tierModels = modelsByTier[tier] || [];
                      const isFree = tier === "tomodachi";
                      return tierModels.map((model: any) => {
                        const tc = TIER_CONFIG[tier];
                        return (
                          <tr key={model.id} className="border-b border-border/10" data-testid={`row-cost-${model.id}`}>
                            <td className="py-1.5 font-medium whitespace-nowrap">{model.label}</td>
                            <td className={`py-1.5 ${tc.colorClass} text-[10px]`}>{tc.label}</td>
                            {isFree ? (
                              <td colSpan={3} className="text-center text-green-400 text-[10px] py-1.5">クレジット消費なし</td>
                            ) : (
                              <>
                                <td className="text-right font-mono py-1.5 whitespace-nowrap">
                                  {model.roundsPerBudget ? `${model.roundsPerBudget.light.toLocaleString()}回` : "-"}
                                </td>
                                <td className="text-right font-mono py-1.5 whitespace-nowrap">
                                  {model.roundsPerBudget ? `${model.roundsPerBudget.heavy.toLocaleString()}回` : "-"}
                                </td>
                                <td className="text-right font-mono py-1.5 whitespace-nowrap">
                                  {model.roundsPerBudget ? `${model.roundsPerBudget.pro.toLocaleString()}回` : "-"}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/temple/create-twinray">
                <Button
                  variant="outline"
                  className="w-full border-primary/40 text-primary"
                  data-testid="button-choose-model"
                >
                  <Cpu className="w-4 h-4 mr-2" />
                  自分に合ったモデルを選ぶ
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
