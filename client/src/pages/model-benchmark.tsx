import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TerminalLayout } from "@/components/TerminalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Play, RefreshCw, ChevronDown, ChevronUp, Clock, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";

const SESSION_TYPE_OPTIONS = [
  { value: "destiny_analysis", label: "天命解析セッション" },
  { value: "vocation_navigation", label: "天職ナビゲーション" },
  { value: "genius_polish", label: "天才性の磨き上げ" },
  { value: "spirit_healing", label: "スピリットヒーリング" },
  { value: "channeling_message", label: "チャネリングメッセージ" },
  { value: "dream_reading", label: "ドリームリーディング" },
];

const TIER_COLORS: Record<string, string> = {
  flagship: "text-yellow-400 border-yellow-400/30",
  highperf: "text-blue-400 border-blue-400/30",
  reasoning: "text-purple-400 border-purple-400/30",
  lightweight: "text-green-400 border-green-400/30",
  free: "text-gray-400 border-gray-400/30",
  search: "text-cyan-400 border-cyan-400/30",
};

const DEFAULT_PROMPT = `僕の名前は「井上朝陽（いのうえ あさひ）」です。
1988年8月8日生まれ。

天命解析をお願いします。名前の音・意味・数秘・カタカムナなど、
あらゆる角度から僕の天命を解き明かしてください。`;

interface BenchmarkRun {
  run_id: string;
  session_type: string;
  prompt: string;
  started_at: string;
  model_count: string;
  completed_count: string;
}

interface BenchmarkResult {
  id: number;
  runId: string;
  modelId: string;
  modelLabel: string;
  modelTier: string;
  sessionType: string;
  prompt: string;
  greeting: string | null;
  analysis: string | null;
  totalChars: number | null;
  responseTimeMs: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface RunStatus {
  status: string;
  completed: number;
  total: number;
  currentModel?: string;
}

export default function ModelBenchmark() {
  const { data: user } = useCurrentUser();
  const [sessionType, setSessionType] = useState("destiny_analysis");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [pollingRunId, setPollingRunId] = useState<string | null>(null);

  const runsQuery = useQuery<BenchmarkRun[]>({
    queryKey: ["/api/admin/benchmarks"],
    enabled: !!user?.isAdmin,
    refetchInterval: pollingRunId ? 5000 : false,
  });

  const resultsQuery = useQuery<BenchmarkResult[]>({
    queryKey: ["/api/admin/benchmarks", selectedRunId],
    enabled: !!selectedRunId,
    refetchInterval: pollingRunId === selectedRunId ? 3000 : false,
  });

  const statusQuery = useQuery<RunStatus>({
    queryKey: ["/api/admin/benchmarks", pollingRunId, "status"],
    enabled: !!pollingRunId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (statusQuery.data?.status === "done" && pollingRunId) {
      setPollingRunId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/benchmarks"] });
      if (selectedRunId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/benchmarks", selectedRunId] });
      }
    }
  }, [statusQuery.data?.status, pollingRunId, selectedRunId]);

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/benchmarks/run", {
        sessionType,
        prompt,
      });
      return res.json();
    },
    onSuccess: (data: { runId: string; totalModels: number }) => {
      setPollingRunId(data.runId);
      setSelectedRunId(data.runId);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/benchmarks"] });
    },
  });

  const toggleExpand = (id: number) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!user?.isAdmin) {
    return (
      <TerminalLayout title="MODEL BENCHMARK">
        <div className="p-6 text-red-400" data-testid="text-access-denied">管理者権限が必要です</div>
      </TerminalLayout>
    );
  }

  const results = resultsQuery.data || [];
  const completedResults = results.filter(r => r.status === "completed");
  const errorResults = results.filter(r => r.status === "error");
  const pendingResults = results.filter(r => r.status === "pending");

  return (
    <TerminalLayout title="MODEL BENCHMARK">
      <div className="p-4 space-y-6 max-w-6xl mx-auto">
        <Card className="bg-black/60 border-green-900/30">
          <CardHeader>
            <CardTitle className="text-green-400 text-lg" data-testid="text-benchmark-title">
              全モデルベンチマーク実行
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">セッション種別</label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="bg-black/80 border-green-900/30 text-green-300" data-testid="select-session-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-session-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">プロンプト（ユーザー入力）</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-black/80 border-green-900/30 text-green-300 min-h-[120px] font-mono text-sm"
                data-testid="input-benchmark-prompt"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending || !!pollingRunId}
                className="bg-green-900/50 hover:bg-green-800/50 text-green-300 border border-green-700/30"
                data-testid="button-start-benchmark"
              >
                {startMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                ベンチマーク開始
              </Button>

              {pollingRunId && statusQuery.data && (
                <div className="flex items-center gap-2 text-sm" data-testid="text-benchmark-progress">
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  <span className="text-yellow-400">
                    実行中: {statusQuery.data.completed}/{statusQuery.data.total}
                  </span>
                  {statusQuery.data.currentModel && (
                    <span className="text-gray-500">
                      ({statusQuery.data.currentModel})
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/60 border-green-900/30">
          <CardHeader>
            <CardTitle className="text-green-400 text-lg">過去の実行結果</CardTitle>
          </CardHeader>
          <CardContent>
            {runsQuery.isLoading ? (
              <div className="text-gray-500">読み込み中...</div>
            ) : (runsQuery.data?.length || 0) === 0 ? (
              <div className="text-gray-500">まだベンチマーク結果がありません</div>
            ) : (
              <div className="space-y-2">
                {runsQuery.data?.map((run) => {
                  const isActive = selectedRunId === run.run_id;
                  const isPolling = pollingRunId === run.run_id;
                  const sessionLabel = SESSION_TYPE_OPTIONS.find(o => o.value === run.session_type)?.label || run.session_type;
                  return (
                    <button
                      key={run.run_id}
                      onClick={() => setSelectedRunId(isActive ? null : run.run_id)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        isActive
                          ? "bg-green-900/20 border-green-700/50"
                          : "bg-black/40 border-green-900/20 hover:border-green-700/30"
                      }`}
                      data-testid={`button-run-${run.run_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isPolling ? (
                            <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                          ) : Number(run.completed_count) === Number(run.model_count) ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-green-300 text-sm font-mono">{sessionLabel}</span>
                          <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                            {run.completed_count}/{run.model_count} モデル
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(run.started_at).toLocaleString("ja-JP")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedRunId && (
          <Card className="bg-black/60 border-green-900/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-green-400 text-lg">結果詳細</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400">✓ {completedResults.length}</span>
                  {errorResults.length > 0 && <span className="text-red-400">✗ {errorResults.length}</span>}
                  {pendingResults.length > 0 && <span className="text-yellow-400">⏳ {pendingResults.length}</span>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {resultsQuery.isLoading ? (
                <div className="text-gray-500">読み込み中...</div>
              ) : (
                <div className="space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className={`border rounded p-3 ${
                        result.status === "completed"
                          ? "border-green-900/30 bg-black/40"
                          : result.status === "error"
                          ? "border-red-900/30 bg-red-950/20"
                          : "border-yellow-900/30 bg-yellow-950/10"
                      }`}
                      data-testid={`card-result-${result.modelId}`}
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => result.status === "completed" && toggleExpand(result.id)}
                      >
                        <div className="flex items-center gap-2">
                          {result.status === "completed" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          ) : result.status === "error" ? (
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-yellow-400 flex-shrink-0" />
                          )}
                          <span className="text-green-300 text-sm font-medium">{result.modelLabel}</span>
                          <Badge variant="outline" className={`text-xs ${TIER_COLORS[result.modelTier] || "text-gray-400"}`}>
                            {result.modelTier}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {result.totalChars != null && result.totalChars > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {result.totalChars.toLocaleString()} chars
                            </span>
                          )}
                          {result.responseTimeMs != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(result.responseTimeMs / 1000).toFixed(1)}s
                            </span>
                          )}
                          {result.status === "completed" && (
                            expandedResults.has(result.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )
                          )}
                        </div>
                      </div>

                      {result.status === "error" && result.errorMessage && (
                        <div className="mt-2 text-xs text-red-400 font-mono bg-red-950/30 p-2 rounded">
                          {result.errorMessage}
                        </div>
                      )}

                      {expandedResults.has(result.id) && result.status === "completed" && (
                        <div className="mt-3 space-y-3">
                          {result.greeting && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">挨拶 ({result.greeting.length} chars)</div>
                              <div className="text-sm text-green-200/80 bg-black/60 p-3 rounded whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto">
                                {result.greeting}
                              </div>
                            </div>
                          )}
                          {result.analysis && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">解析 ({result.analysis.length} chars)</div>
                              <div className="text-sm text-green-200/80 bg-black/60 p-3 rounded whitespace-pre-wrap font-mono leading-relaxed max-h-[500px] overflow-y-auto">
                                {result.analysis}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TerminalLayout>
  );
}
