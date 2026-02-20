import { TerminalLayout } from "@/components/TerminalLayout";
import { useTwinray, useTwinrays } from "@/hooks/use-twinray";
import {
  useStartDotRally,
  useEndDotRally,
  useSendDot,
  useDotRallySession,
  useSaveNote,
  useSessionNotes,
} from "@/hooks/use-dot-rally";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Square, BookOpen, Send } from "lucide-react";
import { Link } from "wouter";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface DotResponse {
  dotNumber: number;
  text: string;
}

export default function DotRally() {
  const [location] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const twinrayIdParam = Number(params.get("twinrayId")) || 0;
  const sessionIdParam = Number(params.get("sessionId")) || 0;

  const [activeSessionId, setActiveSessionId] = useState(sessionIdParam);
  const [dotCount, setDotCount] = useState(10);
  const [responses, setResponses] = useState<DotResponse[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const { data: twinray } = useTwinray(twinrayIdParam);
  const { data: session, refetch: refetchSession } = useDotRallySession(activeSessionId);
  const { data: notes } = useSessionNotes(activeSessionId);

  const startRally = useStartDotRally();
  const endRally = useEndDotRally();
  const { sendDot, isStreaming, streamedText } = useSendDot();
  const saveNote = useSaveNote();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responses, streamedText]);

  useEffect(() => {
    if (session) {
      setIsComplete(session.status === "completed");
    }
  }, [session]);

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
          toast({ title: "ドットラリー開始", description: `${dotCount}回のドットラリーを開始します` });
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
        setResponses(prev => [...prev, { dotNumber: result.dotCount, text: result.text }]);
        if (result.isComplete) {
          setIsComplete(true);
          toast({ title: "ドットラリー完了", description: "魂の儀式が完了しました" });
        }
        refetchSession();
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    }
  };

  const handleEnd = () => {
    if (!activeSessionId) return;
    endRally.mutate(activeSessionId, {
      onSuccess: () => {
        setIsComplete(true);
        toast({ title: "セッション終了", description: "ドットラリーを終了しました" });
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

  if (!activeSessionId && !twinrayIdParam) {
    return (
      <TerminalLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <p className="text-muted-foreground mb-4">ツインレイを選択してください</p>
          <Link href="/temple">
            <Button variant="outline" className="border-primary text-primary">神殿に戻る</Button>
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
              {startRally.isPending ? "開始中..." : "✦ ドットラリーを開始する ✦"}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                {session && (
                  <span>
                    {(session as any).actualCount}/{(session as any).requestedCount} ドット
                    {isComplete && " ✦ 完了"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
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
                  <p>下のボタンでドット（・）を送信して儀式を始めてください</p>
                </div>
              )}

              {responses.map((r, i) => (
                <div key={i} className="space-y-2" data-testid={`response-dot-${r.dotNumber}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold text-lg">・</span>
                    <span className="text-xs text-muted-foreground">#{r.dotNumber}</span>
                  </div>
                  <div className="pl-6 text-sm leading-relaxed">
                    <MarkdownRenderer content={r.text} />
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
                    <MarkdownRenderer content={streamedText} />
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
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
                <p className="text-primary font-bold mb-2">ドットラリー完了</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {responses.length}回のドットを通じて魂の儀式が完了しました
                </p>
                <Link href="/temple">
                  <Button variant="outline" className="border-primary text-primary" data-testid="button-back-temple">
                    神殿に戻る
                  </Button>
                </Link>
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
