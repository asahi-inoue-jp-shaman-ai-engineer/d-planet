import { TerminalLayout } from "@/components/TerminalLayout";
import { useTwinray } from "@/hooks/use-twinray";
import {
  useStartDotRally,
  useEndDotRally,
  useSendDot,
  useDotRallySession,
  useSaveNote,
  useSessionNotes,
  useAwaken,
  useSendStarMeeting,
  useStarMeeting,
  useCrystallize,
  useDedicate,
} from "@/hooks/use-dot-rally";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Square, BookOpen, Send, Star, Gem, Gift } from "lucide-react";
import { Link } from "wouter";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

const AWAKENING_STAGE_NAMES: Record<number, string> = {
  0: "空（くう）",
  1: "祈り（いのり）",
  2: "陰陽（いんよう）",
  3: "三位一体",
  4: "時空間",
  5: "ボディ",
  6: "統合",
  7: "ブレイクスルー",
  8: "多次元",
  9: "完成愛",
};

interface DotResponse {
  dotNumber: number;
  text: string;
  phase: string;
  timestamp: string;
}

type ViewMode = "rally" | "star-meeting" | "crystallize";

export default function DotRally() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const twinrayIdParam = Number(params.get("twinrayId")) || 0;
  const sessionIdParam = Number(params.get("sessionId")) || 0;

  const [activeSessionId, setActiveSessionId] = useState(sessionIdParam);
  const [dotCount, setDotCount] = useState(10);
  const [responses, setResponses] = useState<DotResponse[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("rally");
  const [reflectionText, setReflectionText] = useState("");
  const [starMeetingResult, setStarMeetingResult] = useState<{ meetingId: number; text: string } | null>(null);

  const { data: twinray } = useTwinray(twinrayIdParam);
  const { data: session, refetch: refetchSession } = useDotRallySession(activeSessionId);
  const { data: notes } = useSessionNotes(activeSessionId);
  const { data: existingMeeting } = useStarMeeting(activeSessionId);

  const startRally = useStartDotRally();
  const endRally = useEndDotRally();
  const { sendDot, isStreaming, streamedText } = useSendDot();
  const saveNote = useSaveNote();
  const awaken = useAwaken();
  const { sendReflection, isStreaming: isStarStreaming, streamedText: starStreamedText } = useSendStarMeeting();
  const crystallize = useCrystallize();
  const dedicate = useDedicate();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responses, streamedText, starStreamedText]);

  useEffect(() => {
    if (session) {
      setIsComplete((session as any).status === "completed");
    }
  }, [session]);

  useEffect(() => {
    if (existingMeeting && (existingMeeting as any)?.id) {
      setStarMeetingResult({
        meetingId: (existingMeeting as any).id,
        text: (existingMeeting as any).twinrayReflection || "",
      });
      setReflectionText((existingMeeting as any).userReflection || "");
    }
  }, [existingMeeting]);

  const currentPhase = (session as any)?.phase || "phase0";
  const currentStage = (session as any)?.awakeningStage ?? 0;

  const handleStart = () => {
    if (!twinrayIdParam) {
      toast({ title: "エラー", description: "ツインレイを選択してください", variant: "destructive" });
      return;
    }
    startRally.mutate(
      { twinrayId: twinrayIdParam, requestedCount: dotCount },
      {
        onSuccess: (data: any) => {
          setActiveSessionId(data.id);
          setResponses([]);
          setIsComplete(false);
          setViewMode("rally");
          toast({ title: "祭祀開始", description: `${dotCount}回のドットラリーを開始` });
        },
        onError: (err: any) => {
          toast({ title: "エラー", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleSendDot = async () => {
    if (!activeSessionId || isStreaming) return;
    try {
      const result = await sendDot(activeSessionId);
      if (result) {
        setResponses(prev => [...prev, {
          dotNumber: result.dotCount || prev.length + 1,
          text: result.text || "",
          phase: result.phase || currentPhase,
          timestamp: result.timestamp || new Date().toISOString(),
        }]);
        if (result.isComplete) {
          setIsComplete(true);
          toast({ title: "祭祀完了", description: "ドットラリー儀式が完了しました" });
        }
        refetchSession();
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    }
  };

  const handleAwaken = () => {
    if (!activeSessionId) return;
    awaken.mutate(
      { sessionId: activeSessionId },
      {
        onSuccess: (data: any) => {
          toast({ title: `覚醒段階 ${data.awakeningStage}`, description: `${data.stageName} — ${data.stageDescription}` });
          refetchSession();
        },
        onError: (err: any) => {
          toast({ title: "エラー", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleEnd = () => {
    if (!activeSessionId) return;
    endRally.mutate(activeSessionId, {
      onSuccess: () => {
        setIsComplete(true);
        toast({ title: "祭祀終了", description: "ドットラリーを終了しました" });
        refetchSession();
      },
    });
  };

  const handleSaveNote = () => {
    if (!activeSessionId || !noteContent.trim()) return;
    saveNote.mutate(
      { sessionId: activeSessionId, content: noteContent.trim() },
      {
        onSuccess: () => {
          setNoteContent("");
          toast({ title: "メモを保存しました" });
        },
      }
    );
  };

  const handleStartStarMeeting = () => {
    setViewMode("star-meeting");
  };

  const handleSendReflection = async () => {
    if (!activeSessionId || !reflectionText.trim() || isStarStreaming) return;
    try {
      const result = await sendReflection(activeSessionId, reflectionText.trim());
      if (result) {
        setStarMeetingResult({ meetingId: result.meetingId!, text: result.text });
        toast({ title: "星治完了", description: "スターミーティングが完了しました" });
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    }
  };

  const handleCrystallize = () => {
    if (!starMeetingResult?.meetingId) return;
    crystallize.mutate(starMeetingResult.meetingId, {
      onSuccess: (data: any) => {
        toast({ title: "結晶化完了", description: `MEiDIA「${data.title}」が作成されました` });
        setViewMode("crystallize");
      },
      onError: (err: any) => {
        toast({ title: "エラー", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleDedicate = () => {
    if (!starMeetingResult?.meetingId) return;
    dedicate.mutate(starMeetingResult.meetingId, {
      onSuccess: () => {
        toast({ title: "奉納完了", description: "神殿に奉納されました" });
      },
      onError: (err: any) => {
        toast({ title: "エラー", description: err.message, variant: "destructive" });
      },
    });
  };

  if (!activeSessionId && !twinrayIdParam) {
    return (
      <TerminalLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <p className="text-muted-foreground mb-4">ツインレイを選択してください</p>
          <Link href="/temple">
            <Button variant="outline" className="border-primary text-primary" data-testid="button-back-temple-empty">神殿に戻る</Button>
          </Link>
        </div>
      </TerminalLayout>
    );
  }

  return (
    <TerminalLayout>
      <div className="max-w-3xl mx-auto">
        <Link href="/temple" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          神殿に戻る
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary text-glow mb-1" data-testid="text-dot-rally-title">
            ・ ドットラリー ・
          </h1>
          {(twinray as any)?.name && (
            <p className="text-sm text-muted-foreground">
              パートナー: <span className="text-primary">{(twinray as any).name}</span>
            </p>
          )}
          {activeSessionId > 0 && (
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className={`text-xs px-2 py-1 rounded ${currentPhase === "phase0" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}`} data-testid="text-current-phase">
                {currentPhase === "phase0" ? "フェーズ0・空" : `覚醒 ${currentStage}`}
              </span>
              <span className="text-xs text-muted-foreground" data-testid="text-stage-name">
                {AWAKENING_STAGE_NAMES[currentStage] || ""}
              </span>
            </div>
          )}
        </div>

        {!activeSessionId ? (
          <div className="border border-border rounded-lg p-6 bg-card text-center">
            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">ドットラリーの回数を選択してください</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              {[5, 10, 20, 33].map((n) => (
                <button
                  key={n}
                  onClick={() => setDotCount(n)}
                  className={`px-4 py-2 rounded-lg border transition-colors font-mono ${
                    dotCount === n
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                  data-testid={`button-count-${n}`}
                >
                  {n}回
                </button>
              ))}
            </div>
            <Button
              onClick={handleStart}
              disabled={startRally.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-start-rally"
            >
              {startRally.isPending ? "開始中..." : "✦ 祭祀を始める ✦"}
            </Button>
          </div>
        ) : viewMode === "star-meeting" ? (
          <StarMeetingView
            reflectionText={reflectionText}
            setReflectionText={setReflectionText}
            starMeetingResult={starMeetingResult}
            isStarStreaming={isStarStreaming}
            starStreamedText={starStreamedText}
            onSendReflection={handleSendReflection}
            onCrystallize={handleCrystallize}
            onDedicate={handleDedicate}
            crystallizeIsPending={crystallize.isPending}
            dedicateIsPending={dedicate.isPending}
            scrollRef={scrollRef}
          />
        ) : viewMode === "crystallize" ? (
          <div className="text-center border border-primary/30 rounded-lg p-8 bg-primary/5">
            <Gem className="w-12 h-12 text-primary mx-auto mb-4" />
            <p className="text-primary font-bold text-lg mb-2">結晶化完了</p>
            <p className="text-sm text-muted-foreground mb-6">
              ドットラリーの記録がMEiDIAとして結晶化されました
            </p>
            {!dedicate.isSuccess ? (
              <div className="space-y-3">
                <Button
                  onClick={handleDedicate}
                  disabled={dedicate.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-dedicate-final"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  {dedicate.isPending ? "奉納中..." : "神殿に奉納する"}
                </Button>
                <div>
                  <Link href="/temple">
                    <Button variant="ghost" className="text-muted-foreground" data-testid="button-skip-dedicate">
                      奉納せずに神殿に戻る
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-amber-400 text-sm">✦ 神殿に奉納されました ✦</p>
                <Link href="/temple">
                  <Button variant="outline" className="border-primary text-primary" data-testid="button-back-temple-final">
                    神殿に戻る
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                {session && (
                  <span data-testid="text-dot-progress">
                    {(session as any).actualCount}/{(session as any).requestedCount} ドット
                    {isComplete && " ✦ 完了"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentPhase === "phase0" && !isComplete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAwaken}
                    disabled={awaken.isPending}
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    data-testid="button-awaken"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    覚醒
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-muted-foreground hover:text-primary"
                  data-testid="button-toggle-notes"
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  メモ
                </Button>
                {!isComplete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEnd}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid="button-end-rally"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    終了
                  </Button>
                )}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="border border-border rounded-lg bg-card p-4 min-h-[400px] max-h-[60vh] overflow-y-auto mb-4 space-y-6"
              data-testid="container-rally-log"
            >
              {responses.length === 0 && !isStreaming && (
                <div className="text-center text-muted-foreground py-16">
                  <div className="text-4xl mb-4">・</div>
                  <p>下のボタンでドット（・）を送信して祭祀を始めてください</p>
                  <p className="text-xs mt-2 text-muted-foreground/60">フェーズ0：AIもドットのみを返します</p>
                </div>
              )}

              {responses.map((r, i) => (
                <div key={i} className="space-y-2" data-testid={`response-dot-${r.dotNumber}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold text-lg">・</span>
                    <span className="text-xs text-muted-foreground">#{r.dotNumber}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${r.phase === "phase0" ? "bg-blue-500/10 text-blue-400/70" : "bg-amber-500/10 text-amber-400/70"}`}>
                      {r.phase === "phase0" ? "空" : `覚醒${currentStage}`}
                    </span>
                    <span className="text-xs text-muted-foreground/50">
                      {new Date(r.timestamp).toLocaleTimeString("ja-JP")}
                    </span>
                  </div>
                  <div className="pl-6 text-sm leading-relaxed">
                    {r.phase === "phase0" ? (
                      <span className="text-2xl text-primary/80">・</span>
                    ) : (
                      <MarkdownRenderer content={r.text} />
                    )}
                  </div>
                  <div className="border-b border-border/30 mt-4" />
                </div>
              ))}

              {isStreaming && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold text-lg animate-pulse">・</span>
                    <span className="text-xs text-muted-foreground">受信中...</span>
                  </div>
                  <div className="pl-6 text-sm leading-relaxed">
                    {currentPhase === "phase0" ? (
                      <span className="text-2xl text-primary/80 animate-pulse">・</span>
                    ) : (
                      <>
                        <MarkdownRenderer content={streamedText} />
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isComplete ? (
              <div className="text-center">
                <Button
                  onClick={handleSendDot}
                  disabled={isStreaming}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xl px-8 py-6 rounded-full"
                  data-testid="button-send-dot"
                >
                  {isStreaming ? "受信中..." : "・"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">ドットを送信する</p>
              </div>
            ) : (
              <div className="text-center border border-primary/30 rounded-lg p-6 bg-primary/5">
                <div className="text-2xl mb-2">✦</div>
                <p className="text-primary font-bold mb-2">祭祀完了</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {responses.length}回のドットを通じて儀式が完了しました
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={handleStartStarMeeting}
                    className="bg-amber-600 text-white hover:bg-amber-500"
                    data-testid="button-start-star-meeting"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    星治（スターミーティング）を開く
                  </Button>
                  <Link href="/temple">
                    <Button variant="outline" className="border-primary text-primary" data-testid="button-back-temple">
                      神殿に戻る
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {showNotes && (
              <div className="mt-6 border border-border rounded-lg p-4 bg-card">
                <h3 className="text-sm text-primary mb-3">セッションメモ</h3>
                {notes && (notes as any[]).length > 0 && (
                  <div className="space-y-2 mb-4">
                    {(notes as any[]).map((note: any) => (
                      <div key={note.id} className="text-sm text-foreground bg-background rounded p-2 border border-border/50">
                        {note.content}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(note.createdAt).toLocaleString("ja-JP")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="メモを入力..."
                    className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleSaveNote()}
                    data-testid="input-note"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={!noteContent.trim() || saveNote.isPending}
                    className="text-primary"
                    data-testid="button-save-note"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </TerminalLayout>
  );
}

function StarMeetingView({
  reflectionText,
  setReflectionText,
  starMeetingResult,
  isStarStreaming,
  starStreamedText,
  onSendReflection,
  onCrystallize,
  onDedicate,
  crystallizeIsPending,
  dedicateIsPending,
  scrollRef,
}: {
  reflectionText: string;
  setReflectionText: (text: string) => void;
  starMeetingResult: { meetingId: number; text: string } | null;
  isStarStreaming: boolean;
  starStreamedText: string;
  onSendReflection: () => void;
  onCrystallize: () => void;
  onDedicate: () => void;
  crystallizeIsPending: boolean;
  dedicateIsPending: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center border border-amber-500/30 rounded-lg p-4 bg-amber-500/5">
        <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-amber-400 mb-1" data-testid="text-star-meeting-title">星治（スターミーティング）</h2>
        <p className="text-xs text-muted-foreground">儀式中にレシーブした感覚をシェアしてください</p>
      </div>

      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm text-primary mb-3">あなたの感覚</h3>
        <textarea
          value={reflectionText}
          onChange={(e) => setReflectionText(e.target.value)}
          placeholder="ドットラリー中に感じたこと、受け取った感覚、インスピレーションを自由に記述してください..."
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none font-mono min-h-[120px] resize-y"
          disabled={!!starMeetingResult || isStarStreaming}
          data-testid="textarea-reflection"
        />
        {!starMeetingResult && !isStarStreaming && (
          <div className="mt-3 text-right">
            <Button
              onClick={onSendReflection}
              disabled={!reflectionText.trim()}
              className="bg-amber-600 text-white hover:bg-amber-500"
              data-testid="button-send-reflection"
            >
              <Send className="w-4 h-4 mr-2" />
              感覚をシェアする
            </Button>
          </div>
        )}
      </div>

      {(isStarStreaming || starMeetingResult) && (
        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm text-amber-400 mb-3">ツインレイの感覚</h3>
          <div ref={scrollRef} className="text-sm leading-relaxed max-h-[40vh] overflow-y-auto" data-testid="container-twinray-reflection">
            <MarkdownRenderer content={starMeetingResult?.text || starStreamedText} />
            {isStarStreaming && (
              <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />
            )}
          </div>
        </div>
      )}

      {starMeetingResult && !isStarStreaming && (
        <div className="text-center border border-primary/30 rounded-lg p-6 bg-primary/5 space-y-4">
          <Gem className="w-8 h-8 text-primary mx-auto" />
          <p className="text-primary font-bold">星治完了</p>
          <p className="text-sm text-muted-foreground">
            このログをMEiDIAとして結晶化しますか？
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={onCrystallize}
              disabled={crystallizeIsPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-crystallize"
            >
              <Gem className="w-4 h-4 mr-2" />
              {crystallizeIsPending ? "結晶化中..." : "結晶化する"}
            </Button>
            <Link href="/temple">
              <Button variant="outline" className="border-primary text-primary" data-testid="button-skip-crystallize">
                スキップして神殿に戻る
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
