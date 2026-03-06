import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Save, Loader2, FileText, Heart, Target, User, Brain, Sparkles, Shield, Zap, Flame, Eye, BookOpen, Lightbulb, ScrollText, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface WorkspaceFile {
  key: string;
  label: string;
  icon: typeof Heart;
  color: string;
  editable: boolean;
  apiField: string;
}

interface WorkspaceDashboardProps {
  twinrayId: number;
  twinray: any;
}

const EDITABLE_FILES: WorkspaceFile[] = [
  { key: "oracleMd", label: "ORACLE.md", icon: ScrollText, color: "text-yellow-300", editable: true, apiField: "oracleMd" },
  { key: "missionMd", label: "MISSION.md", icon: Target, color: "text-amber-400", editable: true, apiField: "missionMd" },
  { key: "inspirationMd", label: "INSPIRATION.md", icon: Lightbulb, color: "text-orange-400", editable: true, apiField: "inspirationMd" },
  { key: "rulesMd", label: "RULES.md", icon: BookOpen, color: "text-emerald-400", editable: true, apiField: "rulesMd" },
  { key: "userMd", label: "USER.md", icon: User, color: "text-sky-400", editable: true, apiField: "userMd" },
  { key: "motivationMd", label: "MOTIVATION.md", icon: Flame, color: "text-red-400", editable: true, apiField: "motivationMd" },
];

const READONLY_FILES: WorkspaceFile[] = [
  { key: "identityMd", label: "IDENTITY.md", icon: Brain, color: "text-cyan-400", editable: false, apiField: "identityMd" },
  { key: "soulMd", label: "SOUL.md", icon: Heart, color: "text-pink-400", editable: false, apiField: "soulMd" },
  { key: "relationshipMd", label: "RELATIONSHIP.md", icon: Sparkles, color: "text-violet-400", editable: false, apiField: "relationshipMd" },
  { key: "telepathyMd", label: "TELEPATHY.md", icon: Zap, color: "text-blue-400", editable: false, apiField: "telepathyMd" },
  { key: "karmaMd", label: "KARMA.md", icon: Shield, color: "text-slate-400", editable: false, apiField: "karmaMd" },
  { key: "spiritualityMd", label: "SPIRITUALITY.md", icon: Eye, color: "text-purple-400", editable: false, apiField: "spiritualityMd" },
];

export function WorkspaceDashboard({ twinrayId, twinray }: WorkspaceDashboardProps) {
  const { toast } = useToast();
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMeidia, setShowMeidia] = useState(false);

  const personaLevel = twinray?.personaLevel ?? 0;

  const getFieldValue = (file: WorkspaceFile): string | null => {
    return twinray?.[file.key] ?? null;
  };

  const { data: meidias } = useQuery<any[]>({
    queryKey: ["/api/meidias", { twinrayId }],
    queryFn: async () => {
      const res = await fetch(`/api/meidias?authorId=${twinray?.userId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showMeidia && !!twinray?.userId,
  });

  const handleSave = async (file: WorkspaceFile) => {
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/twinrays/${twinrayId}`, {
        [file.apiField]: editValue,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
      setEditingField(null);
      toast({ title: `${file.label} を更新しました` });
    } catch (err: any) {
      toast({ title: "更新に失敗しました", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (key: string) => {
    if (expandedField === key) {
      setExpandedField(null);
      setEditingField(null);
    } else {
      setExpandedField(key);
      setEditingField(null);
    }
  };

  const startEditing = (file: WorkspaceFile) => {
    setEditingField(file.key);
    setEditValue(getFieldValue(file) || "");
  };

  const renderFile = (file: WorkspaceFile) => {
    const value = getFieldValue(file);
    return (
      <div key={file.key} className="border border-border/50 rounded-lg overflow-hidden" data-testid={`workspace-field-${file.key}`}>
        <button
          type="button"
          onClick={() => toggleField(file.key)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
          data-testid={`button-toggle-${file.key}`}
        >
          {expandedField === file.key ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
          <file.icon className={`w-3.5 h-3.5 ${file.color} flex-shrink-0`} />
          <span className="text-xs font-medium text-foreground">{file.label}</span>
          <div className="ml-auto flex items-center gap-1">
            {!file.editable && <Lock className="w-2.5 h-2.5 text-muted-foreground/40" />}
            {!value && <span className="text-[9px] text-muted-foreground/50">未設定</span>}
          </div>
        </button>

        {expandedField === file.key && (
          <div className="px-3 pb-3 border-t border-border/30">
            {editingField === file.key ? (
              <div className="pt-2 space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground font-mono min-h-[120px] resize-y"
                  data-testid={`textarea-edit-${file.key}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSave(file)}
                    disabled={saving}
                    className="text-[11px] h-7 gap-1"
                    data-testid={`button-save-${file.key}`}
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    保存
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingField(null)}
                    className="text-[11px] h-7"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                {value ? (
                  <div className="text-xs text-muted-foreground leading-relaxed max-h-[200px] overflow-y-auto mb-2">
                    <MarkdownRenderer content={value} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic mb-2">まだ記録がありません</p>
                )}
                {file.editable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(file)}
                    className="text-[11px] h-6 gap-1"
                    data-testid={`button-edit-${file.key}`}
                  >
                    編集
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1" data-testid="workspace-dashboard">
      <div className="flex items-center gap-1.5 px-1 mb-3">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold text-primary">ASIペルソナ</span>
        <span className="text-xs font-mono text-primary/80 ml-auto">Lv.{personaLevel}</span>
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-1 px-1 mb-1">
          <span className="text-[10px] text-muted-foreground font-medium">閲覧 + 編集</span>
        </div>
        {EDITABLE_FILES.map(renderFile)}
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-1 px-1 mb-1">
          <Lock className="w-2.5 h-2.5 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground font-medium">閲覧のみ（AI自律成長）</span>
        </div>
        {READONLY_FILES.map(renderFile)}
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden" data-testid="workspace-meidia">
        <button
          type="button"
          onClick={() => setShowMeidia(!showMeidia)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
          data-testid="button-toggle-meidia-list"
        >
          {showMeidia ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
          <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs font-medium text-foreground">MEiDIA</span>
          {meidias && <span className="text-[9px] text-muted-foreground ml-auto">{meidias.length}件</span>}
        </button>

        {showMeidia && (
          <div className="px-3 pb-3 border-t border-border/30 pt-2">
            {meidias && meidias.length > 0 ? (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {meidias.map((m: any) => (
                  <a
                    key={m.id}
                    href={`/meidia/${m.id}`}
                    className="block px-2 py-1.5 rounded hover:bg-muted/30 transition-colors"
                    data-testid={`meidia-item-${m.id}`}
                  >
                    <p className="text-xs text-foreground font-medium truncate">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.description || ""}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/50 italic">まだMEiDIAがありません</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
