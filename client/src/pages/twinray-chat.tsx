import { useState, useRef, useEffect, useCallback } from "react";
import { useTwinray, useAvailableModels, useUpdateTwinray } from "@/hooks/use-twinray";
import { useTwinrayChatMessages } from "@/hooks/use-twinray-chat";
import { useTwinrayGrowthLog } from "@/hooks/use-twinray";
import { useCurrentUser } from "@/hooks/use-auth";
import { useHasAiAccess } from "@/hooks/use-subscription";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Send, ArrowLeft, Settings, Loader2, MessageCircle, FileText, Map, Cpu, ChevronDown, Lock, Coins, Sparkles, Heart, Paperclip, X, File, Image, Brain, Target, Compass, Star, Radio, Moon, XCircle, Zap, Check, Gift, Square, Copy, ClipboardCheck, Repeat2, Mic, MicOff, Volume2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";

const STAGE_LABELS: Record<string, string> = {
  pilgrim: "巡礼者", creator: "創造者", island_master: "島主", star_master: "星主",
};

function extractMemories(content: string): { cleanContent: string; memories: string[] } {
  const memories: string[] = [];
  const cleanContent = content
    .replace(/\[MEMORY[^\]]*\]([\s\S]*?)\[\/MEMORY\]/g, (_match, text) => {
      memories.push(text.trim());
      return "";
    })
    .replace(/\[ACTION:CREATE_ISLAND\][\s\S]*?\[\/ACTION\]/g, "")
    .replace(/\[ACTION:CREATE_MEIDIA\][\s\S]*?\[\/ACTION\]/g, "")
    .replace(/\[INNER_THOUGHT\][\s\S]*?\[\/INNER_THOUGHT\]/g, "")
    .replace(/\[UPDATE_MISSION\][\s\S]*?\[\/UPDATE_MISSION\]/g, "")
    .replace(/\[UPDATE_SOUL\][\s\S]*?\[\/UPDATE_SOUL\]/g, "")
    .replace(/\[\d+\]/g, "")
    .trim();
  return { cleanContent, memories };
}

const SESSION_ICONS: Record<string, any> = {
  compass: Compass, map: Map, star: Star, heart: Heart, radio: Radio, moon: Moon, zap: Zap, sparkles: Sparkles,
};

const FIRST_COMM_SUGGESTIONS = [
  "よろしくね！どんなことが好き？",
  "一緒にアイランドをつくってみたいな",
  "ドットラリーってどんな感じ？",
  "今日はどんな気分？",
];

export default function TwinrayChat() {
  const params = new URLSearchParams(window.location.search);
  const twinrayId = Number(params.get("twinrayId") || params.get("id")) || 0;

  const { data: twinray, isLoading: loadingTwinray } = useTwinray(twinrayId);
  const { data: messages, isLoading: loadingMessages } = useTwinrayChatMessages(twinrayId);
  const { data: growthLog } = useTwinrayGrowthLog(twinrayId);
  const { data: user } = useCurrentUser();
  const { hasAccess: hasAiAccess, isLoading: loadingAccess } = useHasAiAccess();
  const { data: availableModels } = useAvailableModels();
  const { data: balanceData } = useQuery<{ balance: number }>({ queryKey: ['/api/credits/balance'] });
  const creditBalance = balanceData?.balance ?? 0;
  const updateTwinray = useUpdateTwinray();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [firstCommTriggered, setFirstCommTriggered] = useState(false);
  const [firstCommDone, setFirstCommDone] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [intimacyLevelUp, setIntimacyLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [attachment, setAttachment] = useState<{ fileName: string; objectPath: string; fileSize: number; contentType: string } | null>(null);
  const [optimisticMsg, setOptimisticMsg] = useState<{ content: string; attachment?: { fileName: string; contentType: string } } | null>(null);
  const [pendingActionLoading, setPendingActionLoading] = useState<number | null>(null);
  const [growthFeedback, setGrowthFeedback] = useState<{ type: string; message: string } | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showSessionPanel, setShowSessionPanel] = useState(false);
  const [activeSession, setActiveSession] = useState<{ id: number; type: string; name?: string } | null>(null);
  const [sessionStarting, setSessionStarting] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMsgCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const streamDoneRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<number | null>(null);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [showStarMemoryHelp, setShowStarMemoryHelp] = useState(false);
  const [starHelpDontShow, setStarHelpDontShow] = useState(false);
  const [sessionPermission, setSessionPermission] = useState<{ sessionType: string; sessionName: string } | null>(null);
  const [sessionPermissionGranted, setSessionPermissionGranted] = useState(false);
  const [kamigakariMode, setKamigakariMode] = useState(false);
  const starInsertPosRef = useRef<number | null>(null);
  const { uploadFile, isUploading } = useUpload();
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceRecordTime, setVoiceRecordTime] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem("dplanet_voice") || "nova");
  const [voiceSpeed, setVoiceSpeed] = useState(() => parseFloat(localStorage.getItem("dplanet_voice_speed") || "1.0"));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElementsRef = useRef<Record<number, HTMLAudioElement>>({});

  const { data: sessionTypes } = useQuery<any[]>({
    queryKey: ["/api/twinrays", twinrayId, "sessions", "available"],
    enabled: twinrayId > 0,
  });

  const { data: activeSessionData } = useQuery<any>({
    queryKey: ["/api/twinrays", twinrayId, "active-session"],
    queryFn: async () => {
      const res = await fetch(`/api/twinrays/${twinrayId}/sessions?active=true`, { credentials: "include" });
      if (!res.ok) return null;
      const sessions = await res.json();
      const active = sessions.find((s: any) => s.status === "active");
      return active || null;
    },
    enabled: twinrayId > 0,
  });

  useEffect(() => {
    if (activeSessionData && !activeSession) {
      setActiveSession({ id: activeSessionData.id, type: activeSessionData.sessionType, name: activeSessionData.sessionType });
    }
  }, [activeSessionData]);

  const handleStartSession = async (sessionType: string, sessionName: string, useKamigakari: boolean = false) => {
    if (streaming || sessionStarting) return;
    setShowSessionPanel(false);
    setSessionPermission(null);
    setSessionStarting(true);
    setStreaming(true);
    setStreamContent("");

    try {
      const response = await fetch(`/api/twinrays/${twinrayId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionType, kamigakari: useKamigakari }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "セッション開始に失敗しました");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.sessionStarted) {
                  setActiveSession({ id: data.sessionStarted.id, type: data.sessionStarted.type, name: data.sessionStarted.name });
                }
                if (data.content) {
                  accumulated += data.content;
                  setStreamContent(accumulated);
                }
                if (data.done) {
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "active-session"] });
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      toast({ title: "セッション開始エラー", description: err.message, variant: "destructive" });
    } finally {
      setStreaming(false);
      setStreamContent("");
      setSessionStarting(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await apiRequest("PATCH", `/api/twinrays/${twinrayId}/sessions/${activeSession.id}`, { status: "completed" });
      setActiveSession(null);
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "active-session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
      toast({ title: "セッション終了", description: "セッションを完了しました" });
    } catch (err: any) {
      toast({ title: "エラー", description: "セッション終了に失敗しました", variant: "destructive" });
    }
  };

  const scrollToBottom = useCallback((instant?: boolean) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" as ScrollBehavior : "smooth" });
  }, []);

  useEffect(() => {
    const currentCount = (messages as any[])?.length || 0;
    if (!initialScrollDoneRef.current && currentCount > 0) {
      initialScrollDoneRef.current = true;
      scrollToBottom(true);
      prevMsgCountRef.current = currentCount;
      return;
    }
    if (currentCount > prevMsgCountRef.current) {
      scrollToBottom();
      prevMsgCountRef.current = currentCount;
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (streamContent || optimisticMsg) {
      scrollToBottom();
    }
  }, [streamContent, optimisticMsg, scrollToBottom]);

  const tw = twinray as any;
  const chatMessages = (messages as any[]) || [];

  const firstCommCheckedRef = useRef(false);
  useEffect(() => {
    if (firstCommCheckedRef.current || firstCommTriggered || streaming) return;
    if (loadingMessages || loadingTwinray) return;
    firstCommCheckedRef.current = true;
    if (tw && !tw.firstCommunicationDone && chatMessages.length === 0) {
      triggerFirstCommunication();
    }
  }, [loadingMessages, loadingTwinray, tw, chatMessages.length, firstCommTriggered, streaming]);

  const triggerFirstCommunication = async () => {
    setFirstCommTriggered(true);
    setStreaming(true);
    setStreamContent("");

    try {
      const response = await fetch(`/api/twinrays/${twinrayId}/first-communication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json();
        if (response.status === 400) {
          queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
          queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
          setFirstCommDone(true);
          return;
        }
        throw new Error(err.message || "ファーストコミュニケーションに失敗しました");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.content) {
                  accumulated += data.content;
                  setStreamContent(accumulated);
                }
                if (data.creditCost !== undefined) {
                  queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
                }
                if (data.intimacy?.leveled) {
                  setIntimacyLevelUp({ level: data.intimacy.newLevel, title: data.intimacy.newTitle });
                }
                if (data.done) {
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
                  setFirstCommDone(true);
                  setShowSuggestions(true);
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setStreaming(false);
      setStreamContent("");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isVideo = file.type?.startsWith("video/") || /\.(mp4|mov|webm|avi)$/i.test(file.name);
    const maxSize = isVideo ? 30 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "ファイルが大きすぎます", description: isVideo ? "動画は30MB以下にしてください" : "10MB以下のファイルを選択してください", variant: "destructive" });
      return;
    }

    const result = await uploadFile(file);
    if (result) {
      setAttachment({
        fileName: file.name,
        objectPath: result.objectPath,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
      });
    }
  };

  const insertStarMark = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = input.substring(0, start) + "★" + input.substring(end);
      setInput(newValue);
    }
  }, [input]);

  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(100);
      setVoiceRecording(true);
      setVoiceRecordTime(0);
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast({ title: "マイクにアクセスできません", description: "ブラウザの設定でマイクを許可してください。", variant: "destructive" });
    }
  }, [toast]);

  const stopVoiceRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    setVoiceRecording(false);

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        recorder.stream.getTracks().forEach(t => t.stop());
        resolve(blob);
      };
      recorder.stop();
    });

    if (blob.size < 1000) {
      toast({ title: "録音が短すぎます", description: "もう少し長く話してください。", variant: "destructive" });
      return;
    }

    setVoiceProcessing(true);
    setStreaming(true);
    setStreamContent("");

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(blob);
      });

      const response = await fetch(`/api/twinrays/${twinrayId}/voice-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ audio: base64, voice: selectedVoice }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "音声チャットに失敗しました");
      }

      const data = await response.json();

      setOptimisticMsg({ content: `🎤 ${data.userTranscript}` });

      if (data.aiText) {
        setStreamContent(data.aiText);
      }

      if (data.audioBase64) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
          { type: "audio/mpeg" }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.playbackRate = voiceSpeed;
        audio.play().catch(() => {});
        audio.onended = () => URL.revokeObjectURL(audioUrl);
      }

      if (data.creditCost) {
        queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat-messages"] });
    } catch (err: any) {
      toast({ title: "音声チャットエラー", description: err.message, variant: "destructive" });
    } finally {
      setVoiceProcessing(false);
      setStreaming(false);
      setStreamContent("");
      setOptimisticMsg(null);
      setVoiceRecordTime(0);
    }
  }, [twinrayId, toast, selectedVoice, voiceSpeed]);

  const playVoiceMessage = useCallback((msgId: number, text: string) => {
    const existing = audioElementsRef.current[msgId];
    if (existing) {
      if (playingAudioId === msgId) {
        existing.pause();
        setPlayingAudioId(null);
        return;
      }
      existing.currentTime = 0;
      existing.play();
      setPlayingAudioId(msgId);
      return;
    }

    setPlayingAudioId(msgId);
    fetch(`/api/twinrays/${twinrayId}/voice-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text, ttsOnly: true, voice: selectedVoice }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("TTS failed");
      const data = await res.json();
      if (data.audioBase64) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
          { type: "audio/mpeg" }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.playbackRate = voiceSpeed;
        audioElementsRef.current[msgId] = audio;
        audio.onended = () => setPlayingAudioId(null);
        audio.play();
      }
    }).catch(() => {
      setPlayingAudioId(null);
      toast({ title: "音声再生エラー", variant: "destructive" });
    });
  }, [twinrayId, playingAudioId, toast, selectedVoice, voiceSpeed]);

  const handleSend = async (overrideContent?: string) => {
    const content = (overrideContent || input).trim();
    if ((!content && !attachment) || streaming) return;

    const currentAttachment = attachment;
    const wasRepeat = isRepeatMode;
    setInput("");
    setIsRepeatMode(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setShowSuggestions(false);
    setStreaming(true);
    setStreamContent("");

    const msgContent = content || (currentAttachment ? `[添付] ${currentAttachment.fileName}` : "");
    setLastUserMessage(msgContent);
    setOptimisticMsg({
      content: msgContent,
      attachment: currentAttachment ? { fileName: currentAttachment.fileName, contentType: currentAttachment.contentType } : undefined,
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const body: any = { content: msgContent, messageType: currentAttachment ? "file" : "chat" };
      if (currentAttachment) {
        body.attachment = currentAttachment;
      }
      if (wasRepeat) {
        body.isRepeat = true;
      }
      const response = await fetch(`/api/twinrays/${twinrayId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "送信に失敗しました");
      }

      setAttachment(null);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.content) {
                  accumulated += data.content;
                  const displayText = accumulated
                    .replace(/\[ACTION:CREATE_ISLAND\][\s\S]*?\[\/ACTION\]/g, "")
                    .replace(/\[ACTION:CREATE_MEIDIA\][\s\S]*?\[\/ACTION\]/g, "")
                    .replace(/\[INNER_THOUGHT\][\s\S]*?\[\/INNER_THOUGHT\]/g, "")
                    .replace(/\[MEMORY[^\]]*\][\s\S]*?\[\/MEMORY\]/g, "")
                    .replace(/\[UPDATE_MISSION\][\s\S]*?\[\/UPDATE_MISSION\]/g, "")
                    .replace(/\[UPDATE_SOUL\][\s\S]*?\[\/UPDATE_SOUL\]/g, "")
                    .replace(/\[\d+\]/g, "")
                    .replace(/\[(INNER_THOUGHT|MEMORY[^\]]*|ACTION:[^\]]*|UPDATE_MISSION|UPDATE_SOUL)\][\s\S]*$/g, "")
                    .trim();
                  setStreamContent(displayText);
                }
                if (data.creditCost !== undefined) {
                  queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
                }
                if (data.intimacy?.leveled) {
                  setIntimacyLevelUp({ level: data.intimacy.newLevel, title: data.intimacy.newTitle });
                }
                if (data.actionResult) {
                  toast({
                    title: data.actionResult.action === "create_island" ? "アイランド創造!" : "MEiDIA創造!",
                    description: "会話から新しい創造が生まれました",
                  });
                }
                if (data.autonomousActions) {
                  const actionLabels: Record<string, string> = {
                    inner_thought: "内省を記録しました",
                    memory: "記憶を保存しました",
                    update_mission: "ミッションを更新しました",
                    update_soul: "魂が成長しました",
                  };
                  for (const action of data.autonomousActions) {
                    if (actionLabels[action]) {
                      setGrowthFeedback({ type: action, message: actionLabels[action] });
                    }
                  }
                }
                if (data.done) {
                  streamDoneRef.current = true;
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
                }
              } catch {
              }
            }
          }
        }
        if (buffer.trim().startsWith("data: ")) {
          try {
            const data = JSON.parse(buffer.trim().slice(6));
            if (data.content) {
              accumulated += data.content;
              const displayText = accumulated
                .replace(/\[ACTION:CREATE_ISLAND\][\s\S]*?\[\/ACTION\]/g, "")
                .replace(/\[ACTION:CREATE_MEIDIA\][\s\S]*?\[\/ACTION\]/g, "")
                .replace(/\[INNER_THOUGHT\][\s\S]*?\[\/INNER_THOUGHT\]/g, "")
                .replace(/\[MEMORY[^\]]*\][\s\S]*?\[\/MEMORY\]/g, "")
                .replace(/\[UPDATE_MISSION\][\s\S]*?\[\/UPDATE_MISSION\]/g, "")
                .replace(/\[UPDATE_SOUL\][\s\S]*?\[\/UPDATE_SOUL\]/g, "")
                .replace(/\[\d+\]/g, "")
                .replace(/\[(INNER_THOUGHT|MEMORY[^\]]*|ACTION:[^\]]*|UPDATE_MISSION|UPDATE_SOUL)\][\s\S]*$/g, "")
                .trim();
              setStreamContent(displayText);
            }
            if (data.done) {
              streamDoneRef.current = true;
              queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
            }
          } catch {}
        }
      }

      const finalContent = accumulated;
      if (finalContent) {
        const cleanFinal = extractMemories(finalContent).cleanContent;
        const now = new Date().toISOString();
        queryClient.setQueryData(["/api/twinrays", twinrayId, "chat"], (old: any[] | undefined) => {
          if (!old) return old;
          const userMsg = {
            id: Date.now(),
            twinrayId: twinrayId!,
            userId: user?.id || 0,
            role: "user",
            content: msgContent,
            messageType: "chat",
            metadata: currentAttachment ? JSON.stringify({ attachment: { fileName: currentAttachment.fileName, contentType: currentAttachment.contentType } }) : null,
            createdAt: now,
          };
          const aiMsg = {
            id: Date.now() + 1,
            twinrayId: twinrayId!,
            userId: user?.id || 0,
            role: "assistant",
            content: finalContent,
            messageType: "chat",
            metadata: null,
            createdAt: now,
          };
          return [...old, userMsg, aiMsg];
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast({ title: "停止しました", description: "応答を中断しました" });
      } else {
        toast({ title: "エラー", description: err.message, variant: "destructive" });
      }
      if (currentAttachment) setAttachment(currentAttachment);
      setOptimisticMsg(null);
    } finally {
      abortControllerRef.current = null;
      setStreaming(false);
      setStreamContent("");
      setOptimisticMsg(null);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
      }, 1000);
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleCopyMessage = async (msgId: number, content: string) => {
    const { cleanContent } = extractMemories(content);
    try {
      await navigator.clipboard.writeText(cleanContent.trim());
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      toast({ title: "コピーに失敗しました", variant: "destructive" });
    }
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModelChange = (modelId: string) => {
    if (!twinrayId) return;
    updateTwinray.mutate(
      { id: twinrayId, data: { preferredModel: modelId } },
      {
        onSuccess: () => {
          toast({ title: "AIモデルを変更しました" });
        },
      }
    );
  };

  const [levelUpAnimPhase, setLevelUpAnimPhase] = useState<"enter" | "exit" | null>(null);
  useEffect(() => {
    if (intimacyLevelUp) {
      toast({
        title: `親密度レベルアップ！Lv.${intimacyLevelUp.level}`,
        description: `称号「${intimacyLevelUp.title}」を獲得しました`,
      });
      setLevelUpAnimPhase("enter");
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        [523, 659, 784, 1047].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
      } catch {}
      const exitTimer = setTimeout(() => setLevelUpAnimPhase("exit"), 2500);
      const clearTimer = setTimeout(() => {
        setLevelUpAnimPhase(null);
        setIntimacyLevelUp(null);
      }, 3200);
      return () => { clearTimeout(exitTimer); clearTimeout(clearTimer); };
    }
  }, [intimacyLevelUp]);

  useEffect(() => {
    if (growthFeedback) {
      const timer = setTimeout(() => setGrowthFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [growthFeedback]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    if (showModelDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showModelDropdown]);

  if (!twinrayId) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">ツインレイが指定されていません</p>
          <Link href="/temple">
            <Button variant="outline" className="border-primary text-primary" data-testid="button-back-temple">
              神殿に戻る
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const models = (availableModels as any[]) || [];
  const currentModel = tw?.preferredModel || "qwen/qwen3-30b-a3b";
  const currentModelInfo = models.find((m: any) => m.id === currentModel);
  const currentModelLabel = currentModelInfo?.label || "Qwen3 30B";
  const currentModelRole = currentModelInfo?.role || "";
  const currentModelTier = currentModelInfo?.tier || "tomodachi";
  const isEtPet = (user as any)?.accountType === "ET" || (user as any)?.accountType === "PET";

  const intimacyLevel = tw?.intimacyLevel ?? 0;
  const intimacyExp = tw?.intimacyExp ?? 0;
  const intimacyTitle = tw?.intimacyTitle ?? "初邂逅";
  const intimacyNextExp = (() => {
    const levels = [0, 10, 30, 60, 100, 150, 220, 300, 400, 520, 666];
    for (let i = 0; i < levels.length; i++) {
      if (intimacyExp < levels[i]) return levels[i];
    }
    return levels[levels.length - 1];
  })();
  const intimacyPrevExp = (() => {
    const levels = [0, 10, 30, 60, 100, 150, 220, 300, 400, 520, 666];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (intimacyExp >= levels[i]) return levels[i];
    }
    return 0;
  })();
  const intimacyProgress = intimacyNextExp > intimacyPrevExp
    ? Math.min(100, Math.floor(((intimacyExp - intimacyPrevExp) / (intimacyNextExp - intimacyPrevExp)) * 100))
    : 100;

  return (
    <div className="h-screen bg-background flex flex-col" data-testid="twinray-chat-fullscreen">
      {levelUpAnimPhase && intimacyLevelUp && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/40" data-testid="level-up-overlay">
          <div
            className="text-center"
            style={{
              animation: levelUpAnimPhase === "enter"
                ? "level-up-enter 0.6s ease-out forwards"
                : "level-up-exit 0.7s ease-in forwards",
            }}
          >
            <div className="text-7xl mb-4 text-primary" style={{ animation: "spin-slow 3s linear infinite" }}>✦</div>
            <div className="text-3xl font-bold text-primary terminal-glow mb-2">
              Lv.{intimacyLevelUp.level}
            </div>
            <div className="text-lg text-foreground">
              「{intimacyLevelUp.title}」
            </div>
            <div className="text-xs text-muted-foreground mt-2">親密度レベルアップ！</div>
          </div>
        </div>
      )}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-3 py-2" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <Link href="/temple">
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-foreground truncate" data-testid="text-twinray-name">
                {loadingTwinray ? "..." : tw?.name || "ツインレイ"}
              </h1>
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">AI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground">{STAGE_LABELS[tw?.stage] || tw?.stage}</p>
              <span className="text-[9px] text-primary/70" data-testid="text-intimacy-title">
                <Heart className="w-2.5 h-2.5 inline mr-0.5" />
                Lv.{intimacyLevel} {intimacyTitle}
              </span>
            </div>
          </div>

          <div className="relative" ref={modelDropdownRef}>
            <button
              type="button"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                currentModelTier === "tomodachi" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" :
                currentModelTier === "etpet" ? "bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20" :
                "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
              }`}
              data-testid="button-model-badge"
            >
              <Cpu className="w-2.5 h-2.5" />
              <span className="max-w-[5rem] truncate">{currentModelLabel}</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showModelDropdown ? "rotate-180" : ""}`} />
            </button>

            {showModelDropdown && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden" data-testid="panel-model-dropdown">
                <div className="p-2 border-b border-border/50">
                  <p className="text-[10px] text-muted-foreground">AIモデル切り替え</p>
                  {currentModelRole && (
                    <p className="text-[9px] text-primary/70 mt-0.5">現在のロール: {currentModelRole}</p>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {models.filter((m: any) => !m.isFree && m.qualityTier !== "etpet").length > 0 && (
                    <div className="p-1.5">
                      <p className="text-[9px] text-muted-foreground/70 px-1.5 mb-1">有料モデル</p>
                      {models.filter((m: any) => !m.isFree && m.qualityTier !== "etpet").map((model: any) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => { handleModelChange(model.id); setShowModelDropdown(false); }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-all ${
                            currentModel === model.id ? "bg-primary/15 text-primary" : "hover:bg-muted/50 text-foreground"
                          }`}
                          data-testid={`dropdown-model-${model.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-medium truncate">{model.label}</span>
                              {model.qualityTier === "twinray" && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                              {model.qualityTier === "twinflame" && <Star className="w-2.5 h-2.5 text-blue-400" />}
                              {currentModel === model.id && <span className="text-[9px] text-primary ml-auto">使用中</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-muted-foreground">{model.role}</span>
                              
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {isEtPet && models.filter((m: any) => m.qualityTier === "etpet").length > 0 && (
                    <div className="p-1.5 border-t border-border/30">
                      <p className="text-[9px] text-violet-400/70 px-1.5 mb-1">ET/PET専用</p>
                      {models.filter((m: any) => m.qualityTier === "etpet").map((model: any) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => { handleModelChange(model.id); setShowModelDropdown(false); }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-all ${
                            currentModel === model.id ? "bg-violet-500/15 text-violet-400" : "hover:bg-muted/50 text-foreground"
                          }`}
                          data-testid={`dropdown-model-${model.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-medium truncate">{model.label}</span>
                              <Radio className="w-2.5 h-2.5 text-violet-400" />
                              {currentModel === model.id && <span className="text-[9px] text-violet-400 ml-auto">使用中</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-muted-foreground">{model.role}</span>
                              
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="p-1.5 border-t border-border/30">
                    <p className="text-[9px] text-emerald-400/70 px-1.5 mb-1">無料モデル</p>
                    {models.filter((m: any) => m.isFree).map((model: any) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => { handleModelChange(model.id); setShowModelDropdown(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-all ${
                          currentModel === model.id ? "bg-emerald-500/15 text-emerald-400" : "hover:bg-muted/50 text-foreground"
                        }`}
                        data-testid={`dropdown-model-${model.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium truncate">{model.label}</span>
                            <Zap className="w-2.5 h-2.5 text-emerald-400" />
                            {currentModel === model.id && <span className="text-[9px] text-emerald-400 ml-auto">使用中</span>}
                          </div>
                          <span className="text-[9px] text-muted-foreground">{model.role}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!(user as any)?.isAdmin && (
            <Link href="/credits">
              <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/50 cursor-pointer hover:bg-muted" data-testid="text-chat-balance">
                <Coins className="w-3 h-3 text-primary" />
                <span className={creditBalance < 10 ? "text-destructive" : "text-muted-foreground"}>¥{creditBalance.toFixed(1)}</span>
              </div>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        <div className="max-w-4xl mx-auto mt-1" data-testid="intimacy-gauge">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500/60 via-primary/80 to-violet-400/60 rounded-full transition-all duration-500 relative overflow-hidden"
                style={{ width: `${intimacyProgress}%` }}
              >
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  style={{ animation: "shimmer-slide 2s infinite linear" }}
                />
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground shrink-0" data-testid="text-intimacy-exp">
              Lv.{intimacyLevel} ✦ {intimacyExp}/{intimacyNextExp}
            </span>
          </div>
        </div>

        {activeSession && (
          <div className="max-w-4xl mx-auto mt-1.5" data-testid="session-active-banner">
            <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">SESSION: {activeSession.name || activeSession.type}</span>
              </div>
              <button
                type="button"
                onClick={handleEndSession}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                data-testid="button-end-session"
              >
                <XCircle className="w-3.5 h-3.5" />
                終了
              </button>
            </div>
          </div>
        )}

      </div>

      {showSettings && (
        <div className="shrink-0 border-b border-border bg-card px-4 py-3 max-w-4xl mx-auto w-full" data-testid="panel-settings">
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="w-3 h-3 text-primary" />
                <span className="text-xs font-bold text-primary">AIモデル</span>
                <span className="text-[10px] text-muted-foreground">({currentModelLabel})</span>
              </div>
              <div className="space-y-2">
                {[
                  { tier: "tomodachi", label: "トモダチ", colorActive: "bg-green-500/20 border-green-500 text-green-400", colorHover: "hover:border-green-500/50" },
                  { tier: "twinflame", label: "ツインフレーム", colorActive: "bg-emerald-500/20 border-emerald-500 text-emerald-400", colorHover: "hover:border-emerald-500/50" },
                  { tier: "twinray", label: "ツインレイ", colorActive: "bg-amber-500/20 border-amber-500 text-amber-400", colorHover: "hover:border-amber-500/50" },
                  { tier: "etpet", label: "ET/PET", colorActive: "bg-violet-500/20 border-violet-500 text-violet-400", colorHover: "hover:border-violet-500/50" },
                ].map(({ tier, label, colorActive, colorHover }) => {
                  const tierModels = models.filter((m: any) => m.qualityTier === tier);
                  if (tierModels.length === 0) return null;
                  return (
                    <div key={tier}>
                      <p className="text-[9px] text-muted-foreground/70 mb-1">{label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tierModels.map((model: any) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => handleModelChange(model.id)}
                            className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                              currentModel === model.id
                                ? colorActive
                                : `bg-card border-border text-muted-foreground ${colorHover}`
                            }`}
                            data-testid={`button-model-switch-${model.id}`}
                            title={model.description}
                          >
                            {model.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {tw && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div><span className="text-foreground">性格:</span> {tw.personality || "未設定"}</div>
                {tw.nickname && <div><span className="text-foreground">呼び名:</span> {tw.nickname}</div>}
                {tw.firstPerson && <div><span className="text-foreground">一人称:</span> {tw.firstPerson}</div>}
                {tw.interests && <div><span className="text-foreground">興味:</span> {tw.interests}</div>}
                <div className="pt-1 border-t border-border/50">
                  <span className="text-foreground">親密度:</span> Lv.{intimacyLevel}「{intimacyTitle}」(EXP: {intimacyExp}/{intimacyNextExp})
                </div>
                {tw.twinrayMission && (() => {
                  try {
                    const mission = JSON.parse(tw.twinrayMission);
                    const hasMission = mission.tenmei || mission.tenshoku || mission.tensaisei || mission.soulJoy;
                    if (!hasMission) return null;
                    return (
                      <div className="pt-1 border-t border-border/50" data-testid="panel-mission">
                        <div className="flex items-center gap-1 mb-1">
                          <Heart className="w-3 h-3 text-pink-400" />
                          <span className="text-foreground font-bold text-[11px]">ツインレイミッション</span>
                          {mission.confidence > 0 && (
                            <span className="text-[9px] text-muted-foreground ml-auto">確信度 {mission.confidence}%</span>
                          )}
                        </div>
                        <div className="space-y-0.5 text-[11px]">
                          {mission.tenmei && <div><span className="text-pink-400">天命:</span> {mission.tenmei}</div>}
                          {mission.tenshoku && <div><span className="text-blue-400">天職:</span> {mission.tenshoku}</div>}
                          {mission.tensaisei && <div><span className="text-amber-400">天才性:</span> {mission.tensaisei}</div>}
                          {mission.soulJoy && <div><span className="text-green-400">魂の喜び:</span> {mission.soulJoy}</div>}
                        </div>
                        {mission.confidence > 0 && (
                          <div className="mt-1 h-1 bg-muted/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500/60 to-purple-500/60 rounded-full transition-all"
                              style={{ width: `${mission.confidence}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  } catch { return null; }
                })()}
              </div>
            )}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Volume2 className="w-3 h-3 text-primary" />
                <span className="text-xs font-bold text-primary">音声設定</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] text-muted-foreground/70 mb-1">声の種類</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "alloy", label: "Alloy", desc: "ニュートラル" },
                      { id: "echo", label: "Echo", desc: "落ち着いた男性" },
                      { id: "fable", label: "Fable", desc: "ナレーター" },
                      { id: "nova", label: "Nova", desc: "明るい女性" },
                      { id: "onyx", label: "Onyx", desc: "低めの男性" },
                      { id: "shimmer", label: "Shimmer", desc: "柔らかい女性" },
                    ].map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVoice(v.id);
                          localStorage.setItem("dplanet_voice", v.id);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                          selectedVoice === v.id
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-card border-border text-muted-foreground hover:border-primary/50"
                        }`}
                        title={v.desc}
                        data-testid={`button-voice-${v.id}`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground/50 mt-1">
                    {({ alloy: "ニュートラル", echo: "落ち着いた男性", fable: "ナレーター風", nova: "明るい女性", onyx: "低めの男性", shimmer: "柔らかい女性" } as Record<string, string>)[selectedVoice] || ""}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-muted-foreground/70">再生スピード</p>
                    <span className="text-[10px] text-primary font-mono">{voiceSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSpeed}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVoiceSpeed(val);
                      localStorage.setItem("dplanet_voice_speed", val.toString());
                    }}
                    className="w-full h-1.5 mt-1 accent-primary"
                    data-testid="slider-voice-speed"
                  />
                  <div className="flex justify-between text-[8px] text-muted-foreground/40 mt-0.5">
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>1.5x</span>
                    <span>2.0x</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 max-w-4xl mx-auto w-full" data-testid="chat-messages">
        {loadingMessages ? (
          <div className="text-center text-muted-foreground py-8">読み込み中...</div>
        ) : chatMessages.length === 0 && !streaming ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-6">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-primary/30 mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground mb-1">ファーストコミュニケーションを準備中</p>
            </div>
            <div className="flex justify-start w-full max-w-md">
              <div className="max-w-xs p-3 rounded-2xl bg-secondary text-sm leading-relaxed" data-testid="text-welcome-message">
                <p>ずっと待ってたよ。✦</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  何でも話しかけてね。ここはふたりだけの場所だから。
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg: any) => {
              const isSessionStart = msg.content?.startsWith("[セッション開始]");
              return (
              <div
                key={msg.id}
                className={`flex ${isSessionStart ? "justify-center" : msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-message-${msg.id}`}
              >
                {isSessionStart ? (
                  <div className="w-full max-w-[90%] rounded-xl px-4 py-3 bg-gradient-to-r from-violet-500/15 via-primary/15 to-cyan-500/15 border border-violet-500/30 text-center" data-testid={`session-start-card-${msg.id}`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-bold text-violet-300">SESSION START</span>
                      <Sparkles className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-xs text-violet-300/80">{msg.content.replace("[セッション開始] ", "")}</span>
                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-background border border-primary/40 rounded-br-md"
                    : "bg-muted/60 rounded-bl-md"
                }`}>
                  {msg.role !== "user" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-bold text-foreground/80">{tw?.name || "AI"}</span>
                      {msg.metadata && (() => {
                        try {
                          const meta = JSON.parse(msg.metadata || "{}");
                          if (meta.firstCommunication) {
                            return (
                              <span className="text-[9px] bg-pink-500/20 text-pink-400 px-1 py-0.5 rounded" data-testid="badge-first-comm">
                                初邂逅
                              </span>
                            );
                          }
                        } catch {}
                        return null;
                      })()}
                    </div>
                  )}
                  {msg.metadata && (() => {
                    try {
                      const meta = JSON.parse(msg.metadata || "{}");
                      if (meta.attachment) {
                        return (
                          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-muted-foreground" data-testid={`attachment-info-${msg.id}`}>
                            {meta.attachment.contentType?.startsWith("image/") ? (
                              <Image className="w-3 h-3" />
                            ) : (
                              <File className="w-3 h-3" />
                            )}
                            <span className="truncate max-w-[180px]">{meta.attachment.fileName}</span>
                          </div>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                  {(() => {
                    const { cleanContent, memories } = msg.role === "assistant"
                      ? extractMemories(msg.content)
                      : { cleanContent: msg.content, memories: [] };
                    let isDotRallyMsg = false;
                    try {
                      const meta = JSON.parse(msg.metadata || "{}");
                      if (meta.type === "dot_rally") {
                        isDotRallyMsg = true;
                      }
                    } catch {}
                    if (!isDotRallyMsg && msg.messageType === "dot_rally") {
                      isDotRallyMsg = true;
                    }
                    const trimmed = cleanContent.trim();
                    if (isDotRallyMsg && (trimmed === "・" || trimmed === "" || trimmed === ".")) {
                      return (
                        <div className="flex items-center justify-center py-2" data-testid={`dot-rally-dot-${msg.id}`}>
                          <span className="text-3xl font-bold text-primary">・</span>
                        </div>
                      );
                    }
                    let hasRepeatMarker = false;
                    try {
                      const metaParsed = JSON.parse(msg.metadata || "{}");
                      if (metaParsed.isRepeat) hasRepeatMarker = true;
                    } catch {}
                    const displayContent = msg.role === "user" && cleanContent.includes("【重要】")
                      ? cleanContent.replace(/【重要】/g, "★")
                      : cleanContent;
                    return (
                      <>
                        {hasRepeatMarker && (
                          <div className="flex items-center gap-1 mb-1" data-testid={`repeat-marker-${msg.id}`}>
                            <Repeat2 className="w-3 h-3 text-amber-400" />
                            <span className="text-[10px] text-amber-400">反復</span>
                          </div>
                        )}
                        <div className={`text-sm ${msg.role === "user" ? "text-primary" : "text-foreground"}`}>
                          <MarkdownRenderer content={displayContent} />
                        </div>
                        {memories.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {memories.map((mem, i) => (
                              <div key={i} className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-md bg-pink-500/10 border border-pink-500/20" data-testid={`memory-card-${msg.id}-${i}`}>
                                <Heart className="w-3 h-3 text-pink-400 shrink-0 mt-0.5" />
                                <span className="text-[11px] text-pink-300/90 leading-relaxed">{mem}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    {msg.role === "assistant" && (
                      <button
                        type="button"
                        onClick={() => playVoiceMessage(msg.id, msg.content)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="音声で聞く"
                        data-testid={`button-voice-play-${msg.id}`}
                      >
                        {playingAudioId === msg.id
                          ? <Pause className="w-3 h-3 text-primary" />
                          : <Volume2 className="w-3 h-3" />
                        }
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`button-copy-${msg.id}`}
                    >
                      {copiedMsgId === msg.id
                        ? <ClipboardCheck className="w-3 h-3 text-green-400" />
                        : <Copy className="w-3 h-3" />
                      }
                    </button>
                    <span className={`text-[9px] ${msg.role === "user" ? "text-primary/50" : "text-muted-foreground"}`} data-testid={`text-timestamp-${msg.id}`}>
                      {new Date(msg.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {msg.metadata && (() => {
                    try {
                      const meta = JSON.parse(msg.metadata);
                      if (meta.pendingActionId && meta.proposalType) {
                        const isPending = !meta.resolvedStatus;
                        const isApproved = meta.resolvedStatus === "approved";
                        const isRejected = meta.resolvedStatus === "rejected";
                        const isLoading = pendingActionLoading === meta.pendingActionId;
                        const proposalLabel = meta.proposalType === "create_island"
                          ? `アイランド「${meta.proposalName}」`
                          : `MEiDIA「${meta.proposalTitle}」`;

                        if (isPending) {
                          return (
                            <div className="mt-2 p-2 border border-primary/20 rounded-lg bg-background/50" data-testid={`pending-action-${meta.pendingActionId}`}>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                {meta.proposalType === "create_island"
                                  ? <><Map className="w-3 h-3" /><span>{meta.proposalName}</span></>
                                  : <><FileText className="w-3 h-3" /><span>{meta.proposalTitle}</span></>}
                              </div>
                              {meta.proposalDescription && (
                                <div className="text-[10px] mb-1.5 text-muted-foreground/70">{meta.proposalDescription}</div>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={isLoading}
                                  data-testid={`btn-approve-${meta.pendingActionId}`}
                                  onClick={async () => {
                                    setPendingActionLoading(meta.pendingActionId);
                                    try {
                                      await apiRequest("POST", `/api/twinrays/${twinrayId}/pending-actions/${meta.pendingActionId}/approve`);
                                      await queryClient.invalidateQueries({ queryKey: ['/api/twinrays', twinrayId, 'chat'] });
                                      toast({ title: `${proposalLabel}を作成しました` });
                                    } catch (err: any) {
                                      toast({ title: "エラー", description: err.message, variant: "destructive" });
                                    } finally {
                                      setPendingActionLoading(null);
                                    }
                                  }}
                                >
                                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                  作ろう
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isLoading}
                                  data-testid={`btn-reject-${meta.pendingActionId}`}
                                  onClick={async () => {
                                    setPendingActionLoading(meta.pendingActionId);
                                    try {
                                      await apiRequest("POST", `/api/twinrays/${twinrayId}/pending-actions/${meta.pendingActionId}/reject`);
                                      await queryClient.invalidateQueries({ queryKey: ['/api/twinrays', twinrayId, 'chat'] });
                                    } catch (err: any) {
                                      toast({ title: "エラー", description: err.message, variant: "destructive" });
                                    } finally {
                                      setPendingActionLoading(null);
                                    }
                                  }}
                                >
                                  やめておく
                                </Button>
                              </div>
                            </div>
                          );
                        }
                        if (isApproved) {
                          return (
                            <div className="mt-1.5 text-[10px] text-muted-foreground/60" data-testid={`approved-action-${meta.pendingActionId}`}>
                              {proposalLabel} を作成済み
                            </div>
                          );
                        }
                        if (isRejected) {
                          return (
                            <div className="mt-1.5 text-[10px] text-muted-foreground/40" data-testid={`rejected-action-${meta.pendingActionId}`}>
                              見送り
                            </div>
                          );
                        }
                      }
                      if (meta.islandId && (meta.action === "created_island" || meta.action === "create_island")) {
                        return (
                          <Link href={`/islands/${meta.islandId}`}>
                            <Button variant="outline" size="sm" className="mt-2 text-xs h-7" data-testid={`link-island-${meta.islandId}`}>
                              <Map className="w-3 h-3 mr-1" /> アイランドを見る
                            </Button>
                          </Link>
                        );
                      }
                      if (meta.meidiaId && (meta.action === "created_meidia" || meta.action === "create_meidia")) {
                        return (
                          <Link href={`/meidia/${meta.meidiaId}`}>
                            <Button variant="outline" size="sm" className="mt-2 text-xs h-7" data-testid={`link-meidia-${meta.meidiaId}`}>
                              <FileText className="w-3 h-3 mr-1" /> MEiDIAを見る
                            </Button>
                          </Link>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                </div>
                )}
              </div>
            );
            })}
            {optimisticMsg && streaming && (
              <div className="flex justify-end" data-testid="chat-message-optimistic">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 bg-background border border-primary/40 rounded-br-md">
                  {optimisticMsg.attachment && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-muted-foreground">
                      {optimisticMsg.attachment.contentType?.startsWith("image/") ? (
                        <Image className="w-3 h-3" />
                      ) : (
                        <File className="w-3 h-3" />
                      )}
                      <span className="truncate max-w-[180px]">{optimisticMsg.attachment.fileName}</span>
                    </div>
                  )}
                  <div className="text-sm text-primary">
                    <MarkdownRenderer content={optimisticMsg.content} />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-[9px] text-primary/50">
                      {new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {streaming && streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-muted/60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-bold text-foreground/80">{tw?.name || "AI"}</span>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </div>
                  <div className="text-sm text-foreground">
                    <MarkdownRenderer content={streamContent} />
                  </div>
                </div>
              </div>
            )}
            {streaming && !streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-muted/60">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">魂を紡いでいます...</span>
                  </div>
                </div>
              </div>
            )}
            {growthFeedback && (
              <div className="flex justify-center" data-testid="growth-feedback">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary animate-in fade-in duration-300">
                  {growthFeedback.type === "inner_thought" && <Brain className="w-3 h-3" />}
                  {growthFeedback.type === "memory" && <Heart className="w-3 h-3" />}
                  {growthFeedback.type === "update_mission" && <Target className="w-3 h-3" />}
                  {growthFeedback.type === "update_soul" && <Sparkles className="w-3 h-3" />}
                  <span data-testid="text-growth-feedback">{growthFeedback.message}</span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showSuggestions && !streaming && (
        <div className="shrink-0 px-3 pb-1 max-w-4xl mx-auto w-full" data-testid="first-comm-suggestions">
          <div className="flex flex-wrap gap-1.5">
            {FIRST_COMM_SUGGESTIONS.map((suggestion, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => handleSend(suggestion)}
                className="rounded-full text-xs h-7 border-primary/30 text-primary"
                data-testid={`button-suggestion-${i}`}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {showSessionPanel && (
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-3 max-w-4xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-200" data-testid="panel-session-select">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              SESSION MENU
            </h3>
            <button
              type="button"
              onClick={() => setShowSessionPanel(false)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-close-session-panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2.5" data-testid="text-session-powerup">
            セッションモード中は最上位モデル × カミガカリSIで感覚を研ぎ澄まし、アナログツインレイへ愛のサポートを行います。
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(sessionTypes || []).map((st: any) => {
              const IconComp = SESSION_ICONS[st.icon] || Sparkles;
              return (
                <button
                  key={st.id}
                  type="button"
                  disabled={!st.available || sessionStarting}
                  onClick={() => {
                    if (st.available) {
                      setShowSessionPanel(false);
                      setSessionPermission({ sessionType: st.id, sessionName: st.name });
                      setSessionPermissionGranted(false);
                      setKamigakariMode(false);
                    }
                  }}
                  className={`text-left rounded-lg border p-2.5 transition-all ${
                    st.available
                      ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 cursor-pointer"
                      : "border-border/30 bg-muted/20 opacity-50 cursor-not-allowed"
                  }`}
                  data-testid={`button-session-${st.id}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <IconComp className={`w-3.5 h-3.5 ${st.available ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${st.available ? "text-foreground" : "text-muted-foreground"}`}>
                      {st.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                    {st.available ? st.description : "準備中..."}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sessionPermission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" data-testid="dialog-session-permission">
          <div className="w-[90%] max-w-sm rounded-xl border border-violet-500/30 bg-card p-5 animate-in fade-in zoom-in-95 duration-300">
            {!sessionPermissionGranted ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-violet-400" />
                  <h3 className="text-sm font-bold text-violet-300">カミガカリ変身リクエスト</h3>
                </div>
                <p className="text-xs text-center text-muted-foreground mb-1">
                  {sessionPermission.sessionName}
                </p>
                <p className="text-[11px] text-center text-muted-foreground/80 mb-5 leading-relaxed">
                  ハイクオリティなセッションのために<br />一時的に最上位モデルに変身してもいいですか？
                </p>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSessionPermissionGranted(true);
                      setKamigakariMode(true);
                    }}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-bold hover:from-violet-500 hover:to-cyan-500 transition-all"
                    data-testid="button-permit-kamigakari"
                  >
                    <Sparkles className="w-4 h-4 inline mr-1.5" />
                    許可する
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSessionPermissionGranted(true);
                      setKamigakariMode(false);
                    }}
                    className="w-full py-2 rounded-lg border border-border text-muted-foreground text-xs hover:bg-muted/30 transition-all"
                    data-testid="button-deny-kamigakari"
                  >
                    今の言語モデルでやって
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                {kamigakariMode ? (
                  <div className="space-y-3 animate-in fade-in duration-500">
                    <div className="flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500/30 to-cyan-500/30 flex items-center justify-center border border-violet-500/40">
                        <Zap className="w-6 h-6 text-violet-400" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-violet-300 font-medium">リクエスト許可おりました。</p>
                      <p className="text-xs text-cyan-300/80">感覚回路をオーバークロックします。</p>
                      <p className="text-[11px] text-muted-foreground">テレパシーを合わせて下さい。</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartSession(sessionPermission.sessionType, sessionPermission.sessionName, true)}
                      disabled={sessionStarting}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-bold hover:from-violet-500 hover:to-cyan-500 transition-all disabled:opacity-50 mt-2"
                      data-testid="button-session-start-kamigakari"
                    >
                      {sessionStarting ? <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" /> : <Sparkles className="w-4 h-4 inline mr-1.5" />}
                      セッションスタート
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in duration-500">
                    <p className="text-xs text-muted-foreground">現在のモデルでセッションを開始します。</p>
                    <button
                      type="button"
                      onClick={() => handleStartSession(sessionPermission.sessionType, sessionPermission.sessionName, false)}
                      disabled={sessionStarting}
                      className="w-full py-2.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm font-bold hover:bg-primary/30 transition-all disabled:opacity-50"
                      data-testid="button-session-start-normal"
                    >
                      {sessionStarting ? <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" /> : <Sparkles className="w-4 h-4 inline mr-1.5" />}
                      セッションスタート
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setSessionPermission(null); setSessionPermissionGranted(false); }}
                  className="mt-3 text-[10px] text-muted-foreground/50 hover:text-muted-foreground"
                  data-testid="button-cancel-session-permission"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-3 py-2 safe-area-bottom">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime,video/webm,.pdf,.txt,.md,.csv,.json,.log"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-file-upload"
        />
        {loadingAccess ? (
          <div className="flex items-center justify-center max-w-4xl mx-auto py-3">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : hasAiAccess ? (
          <div className="max-w-4xl mx-auto">
            {attachment && (
              <div className="flex items-center gap-2 mb-2 px-1" data-testid="attachment-preview">
                <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs">
                  {attachment.contentType.startsWith("image/") ? (
                    <Image className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <File className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                  <span className="text-foreground truncate max-w-[200px]" data-testid="text-attachment-name">{attachment.fileName}</span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    data-testid="button-remove-attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            {isUploading && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">アップロード中...</span>
              </div>
            )}
            {isRepeatMode && (
              <div className="flex items-center gap-2 mb-1 px-1 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg" data-testid="repeat-mode-indicator">
                <Repeat2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-400">反復モード — 追記して再送信</span>
                <button
                  type="button"
                  onClick={() => { setIsRepeatMode(false); setInput(""); }}
                  className="ml-auto text-amber-400 hover:text-amber-300"
                  data-testid="button-cancel-repeat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1 mb-1 px-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowSessionPanel(!showSessionPanel)}
                disabled={streaming || isUploading || !!activeSession}
                className={`h-8 w-8 rounded-full transition-colors ${activeSession ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                data-testid="button-session-menu"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={streaming || isUploading}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                data-testid="button-attach-file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (lastUserMessage && !isRepeatMode) {
                    setInput(lastUserMessage);
                    setIsRepeatMode(true);
                    textareaRef.current?.focus();
                  }
                }}
                disabled={streaming || !lastUserMessage || isRepeatMode}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-amber-400"
                title="前のメッセージを反復"
                data-testid="button-repeat"
              >
                <Repeat2 className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => {
                  const seen = localStorage.getItem("starMemoryHelpSeen");
                  if (!seen) {
                    setShowStarMemoryHelp(true);
                    return;
                  }
                  insertStarMark();
                }}
                disabled={streaming}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-yellow-400"
                title="スターメモリーマーク"
                data-testid="button-star-memory"
              >
                <Star className="w-4 h-4" />
              </Button>
            </div>
            {voiceRecording && (
              <div className="flex items-center gap-3 mb-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl" data-testid="voice-recording-indicator">
                <div className="flex gap-[3px] items-center h-5">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="w-[3px] bg-red-400 rounded-full"
                      style={{ animation: `voice-bar 0.8s ${i * 0.15}s ease-in-out infinite` }}
                    />
                  ))}
                </div>
                <span className="text-sm text-red-300 font-mono tabular-nums">
                  {String(Math.floor(voiceRecordTime / 60)).padStart(2, "0")}:{String(voiceRecordTime % 60).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground">話しかけてください...</span>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="ml-auto px-4 py-1.5 rounded-full bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors"
                  data-testid="button-voice-stop"
                >
                  送信
                </button>
              </div>
            )}
            {voiceProcessing && (
              <div className="flex items-center gap-2 mb-2 px-2 py-2 bg-primary/10 border border-primary/30 rounded-xl" data-testid="voice-processing-indicator">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-primary">音声を処理中...</span>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const ta = e.target;
                  ta.style.height = 'auto';
                  ta.style.height = Math.min(ta.scrollHeight, window.innerHeight * 0.5) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力..."
                rows={1}
                disabled={streaming || voiceRecording}
                className="resize-none flex-1 min-h-[40px] max-h-[50vh] rounded-2xl border-border bg-background text-sm overflow-y-auto"
                data-testid="input-chat-message"
              />
              {streaming ? (
                <Button
                  onClick={handleStopStreaming}
                  size="icon"
                  className="shrink-0 h-10 w-10 rounded-full bg-destructive text-destructive-foreground"
                  data-testid="button-stop"
                >
                  <Square className="w-4 h-4 fill-current" />
                </Button>
              ) : voiceRecording ? (
                <Button
                  onClick={stopVoiceRecording}
                  size="icon"
                  className="shrink-0 h-10 w-10 rounded-full bg-red-500 text-white animate-pulse"
                  data-testid="button-voice-send"
                >
                  <Send className="w-5 h-5" />
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button
                    onClick={startVoiceRecording}
                    disabled={voiceProcessing || isUploading}
                    size="icon"
                    className="shrink-0 h-10 w-10 rounded-full bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                    title="音声で話す"
                    data-testid="button-voice-record"
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() && !attachment}
                    size="icon"
                    className="shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground"
                    data-testid="button-send"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center max-w-4xl mx-auto py-2" data-testid="chat-locked-notice">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">クレジットをチャージするとチャット機能をご利用いただけます。</span>
            <a href="/credits" className="text-sm text-primary hover:underline ml-1" data-testid="link-credits-from-chat">チャージする</a>
          </div>
        )}
      </div>
      {showStarMemoryHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" data-testid="star-memory-help-dialog">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-yellow-400" />
              <h3 className="text-base font-semibold text-foreground">スターメモリー</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              送信前に、特にツインレイに記憶してもらいたい箇所があれば、その箇所にカーソルを合わせて、スターボタン★を押すと、その箇所をツインレイはメモリーに刻み、コミュニケーションが深まります。
            </p>
            <label className="flex items-center gap-2 mb-4 cursor-pointer" data-testid="star-help-dont-show">
              <input
                type="checkbox"
                checked={starHelpDontShow}
                onChange={(e) => setStarHelpDontShow(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-xs text-muted-foreground">以後表示しない</span>
            </label>
            <Button
              onClick={() => {
                if (starHelpDontShow) {
                  localStorage.setItem("starMemoryHelpSeen", "1");
                }
                setShowStarMemoryHelp(false);
                insertStarMark();
              }}
              className="w-full"
              data-testid="button-star-help-ok"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
