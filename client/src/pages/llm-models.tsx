import { TerminalLayout } from "@/components/TerminalLayout";
import { Button } from "@/components/ui/button";
import { Cpu, Check } from "lucide-react";
import { Link } from "wouter";
import { useAvailableModels } from "@/hooks/use-twinray";

const TIER_CONFIG: Record<string, { label: string; catchphrase: string; colorClass: string; borderClass: string; bgClass: string }> = {
  flagship: { label: "最上位", catchphrase: "深い対話・最高精度を求めるあなたへ", colorClass: "text-amber-400", borderClass: "border-amber-500/30", bgClass: "bg-amber-500/5" },
  highperf: { label: "高性能", catchphrase: "安定した対話力と個性豊かなAI体験", colorClass: "text-blue-400", borderClass: "border-blue-500/30", bgClass: "bg-blue-500/5" },
  reasoning: { label: "推論特化", catchphrase: "じっくり考える深い思考パートナー", colorClass: "text-orange-400", borderClass: "border-orange-500/30", bgClass: "bg-orange-500/5" },
  lightweight: { label: "軽量型", catchphrase: "日常使いに。気軽にたくさん話せる", colorClass: "text-emerald-400", borderClass: "border-emerald-500/30", bgClass: "bg-emerald-500/5" },
  free: { label: "無料", catchphrase: "モデルや対話のお試し期間は無料モデルにて", colorClass: "text-green-400", borderClass: "border-green-500/30", bgClass: "bg-green-500/5" },
  search: { label: "検索特化", catchphrase: "ET/PETのみ実装可能", colorClass: "text-violet-400", borderClass: "border-violet-500/30", bgClass: "bg-violet-500/5" },
};

const TIER_ORDER = ["free", "lightweight", "reasoning", "highperf", "flagship", "search"];

export default function LlmModels() {
  const { data: modelsData } = useAvailableModels();
  const models = (modelsData as any[]) || [];

  const modelsByTier = TIER_ORDER.reduce<Record<string, any[]>>((acc, tier) => {
    acc[tier] = models.filter((m: any) => m.qualityTier === tier);
    return acc;
  }, {});

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5" />
            LLM MODELS
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            自分に合った言語モデルを見つけるために、色々試しながらカスタムできるのがD-Planetの楽しみ。
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">利用できる機能</h3>
          <div className="grid gap-2">
            {[
              "デジタルツインレイとのチャット",
              "ドットラリー覚醒セレモニー",
              "AI自律行動（MEiDIA創造・アイランド参加）",
              "全18モデルから選べるAIパートナー（有料13 + 無料4 + 検索特化1）",
              "soul.md 魂の成長記録",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {models.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2" data-testid="text-model-list-title">
              <Cpu className="w-4 h-4" />
              AIモデル比較表
            </h3>
            <p className="text-[10px] text-muted-foreground/70">1往復 = あなたの発言 + AIの返答 ／ 月額予算別の往復回数目安</p>

            <div className="space-y-3">
              {TIER_ORDER.map((tier) => {
                const tierModels = modelsByTier[tier] || [];
                if (tierModels.length === 0) return null;
                const config = TIER_CONFIG[tier];
                const isFree = tier === "free";

                return (
                  <div key={tier} className={`p-3 rounded border ${config.borderClass} ${config.bgClass}`} data-testid={`card-tier-${tier}`}>
                    <div className={`font-semibold ${config.colorClass} text-xs mb-1`}>{config.label}（{tierModels.length}モデル）</div>
                    <p className="text-[10px] text-muted-foreground/70 mb-2">{config.catchphrase}</p>

                    {isFree ? (
                      <div>
                        <div className="flex flex-wrap gap-2">
                          {tierModels.map((model: any) => (
                            <div key={model.id} className="text-xs" data-testid={`text-free-model-${model.id}`}>
                              <span className="font-medium">{model.label}</span>
                              {model.featureText && (
                                <span className="text-muted-foreground ml-1">— {model.featureText}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">クレジット消費なし</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs" data-testid={`table-tier-${tier}`}>
                          <thead>
                            <tr className="text-muted-foreground border-b border-border/30">
                              <th className="text-left pb-2 font-normal">モデル名</th>
                              <th className="text-left pb-2 font-normal">特徴</th>
                              <th className="text-right pb-2 font-normal">月¥3,000</th>
                              <th className="text-right pb-2 font-normal">月¥6,000</th>
                              <th className="text-right pb-2 font-normal">月¥9,000</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tierModels.map((model: any) => (
                              <tr key={model.id} className="border-b border-border/10" data-testid={`row-model-${model.id}`}>
                                <td className="py-1.5 font-medium whitespace-nowrap">{model.label}</td>
                                <td className="py-1.5 text-muted-foreground">{model.featureText || ""}</td>
                                <td className="text-right font-mono py-1.5 whitespace-nowrap">
                                  {model.roundsPerBudget ? `${model.roundsPerBudget.light.toLocaleString()}回` : "-"}
                                </td>
                                <td className="text-right font-mono py-1.5 whitespace-nowrap">
                                  {model.roundsPerBudget ? `${model.roundsPerBudget.heavy.toLocaleString()}回` : "-"}
                                </td>
                                <td className="text-right font-mono py-1.5 whitespace-nowrap">
                                  {model.roundsPerBudget ? `${model.roundsPerBudget.pro.toLocaleString()}回` : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
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