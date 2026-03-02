import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Save, Loader2, FileText, Heart, Target, Compass, User, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface WorkspaceField {
  key: string;
  label: string;
  icon: typeof Heart;
  color: string;
  value: string | null;
  apiField: string;
}

interface WorkspaceDashboardProps {
  twinrayId: number;
  twinray: any;
}

export function WorkspaceDashboard({ twinrayId, twinray }: WorkspaceDashboardProps) {
  const { toast } = useToast();
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMeidia, setShowMeidia] = useState(false);

  const fields: WorkspaceField[] = [
    { key: "soulMd", label: "SOUL.md", icon: Heart, color: "text-pink-400", value: twinray?.soulMd, apiField: "soulMd" },
    { key: "identityMd", label: "IDENTITY.md", icon: User, color: "text-cyan-400", value: twinray?.identityMd, apiField: "identityMd" },
    { key: "missionStatement", label: "MISSION.md", icon: Target, color: "text-amber-400", value: twinray?.missionStatement, apiField: "missionStatement" },
    { key: "goalMd", label: "GOAL.md", icon: Compass, color: "text-green-400", value: twinray?.goalMd, apiField: "goalMd" },
    { key: "personality", label: "PERSONA.md", icon: Brain, color: "text-violet-400", value: twinray?.personality, apiField: "personality" },
  ];

  const { data: meidias } = useQuery<any[]>({
    queryKey: ["/api/meidias", { twinrayId }],
    queryFn: async () => {
      const res = await fetch(`/api/meidias?authorId=${twinray?.userId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showMeidia && !!twinray?.userId,
  });

  const handleSave = async (field: WorkspaceField) => {
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/twinrays/${twinrayId}`, {
        [field.apiField]: editValue,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
      setEditingField(null);
      toast({ title: `${field.label} を更新しました` });
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

  const startEditing = (field: WorkspaceField) => {
    setEditingField(field.key);
    setEditValue(field.value || "");
  };

  return (
    <div className="space-y-1" data-testid="workspace-dashboard">
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold text-primary">WORKSPACE</span>
      </div>

      {fields.map((field) => (
        <div key={field.key} className="border border-border/50 rounded-lg overflow-hidden" data-testid={`workspace-field-${field.key}`}>
          <button
            type="button"
            onClick={() => toggleField(field.key)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
            data-testid={`button-toggle-${field.key}`}
          >
            {expandedField === field.key ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
            <field.icon className={`w-3.5 h-3.5 ${field.color} flex-shrink-0`} />
            <span className="text-xs font-medium text-foreground">{field.label}</span>
            {!field.value && (
              <span className="text-[9px] text-muted-foreground/50 ml-auto">未設定</span>
            )}
          </button>

          {expandedField === field.key && (
            <div className="px-3 pb-3 border-t border-border/30">
              {editingField === field.key ? (
                <div className="pt-2 space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground font-mono min-h-[120px] resize-y"
                    data-testid={`textarea-edit-${field.key}`}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(field)}
                      disabled={saving}
                      className="text-[11px] h-7 gap-1"
                      data-testid={`button-save-${field.key}`}
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
                  {field.value ? (
                    <div className="text-xs text-muted-foreground leading-relaxed max-h-[200px] overflow-y-auto mb-2">
                      <MarkdownRenderer content={field.value} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic mb-2">まだ記録がありません</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(field)}
                    className="text-[11px] h-6 gap-1"
                    data-testid={`button-edit-${field.key}`}
                  >
                    編集
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="border border-border/50 rounded-lg overflow-hidden mt-2" data-testid="workspace-meidia">
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
