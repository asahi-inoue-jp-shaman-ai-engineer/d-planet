import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Bug, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { DevIssue } from "@shared/schema";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Bug }> = {
  open: { label: "未対応", variant: "destructive", icon: AlertTriangle },
  in_progress: { label: "対応中", variant: "default", icon: Clock },
  resolved: { label: "解決済み", variant: "secondary", icon: CheckCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: "高", color: "text-red-400" },
  medium: { label: "中", color: "text-yellow-400" },
  low: { label: "低", color: "text-green-400" },
};

function IssueCard({ issue }: { issue: DevIssue }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  const update = useMutation({
    mutationFn: (body: object) => apiRequest("PATCH", `/api/dev-issues/${issue.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dev-issues"] });
      toast({ title: "更新しました" });
    },
  });

  const status = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open;
  const priority = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.medium;
  const StatusIcon = status.icon;

  return (
    <Card className="border border-border/50" data-testid={`card-issue-${issue.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-muted-foreground shrink-0">#{issue.id}</span>
            <span className="font-mono text-sm font-semibold truncate" data-testid={`text-issue-title-${issue.id}`}>{issue.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-mono font-bold ${priority.color}`}>{priority.label}</span>
            <Badge variant={status.variant} className="text-xs font-mono flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="text-xs font-mono text-muted-foreground flex items-center gap-3">
          <span>報告: {issue.reporter}</span>
          <span>担当: {issue.assignedTo}</span>
          <span>{new Date(issue.createdAt).toLocaleDateString("ja-JP")}</span>
        </div>

        <button
          className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors font-mono"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-${issue.id}`}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "折りたたむ" : "詳細"}
        </button>

        {expanded && (
          <div className="space-y-3 pt-1 border-t border-border/30">
            <p className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">{issue.description}</p>
            {issue.resolutionNote && (
              <div className="bg-muted/30 rounded p-2">
                <p className="text-xs font-mono text-muted-foreground">対応メモ: {issue.resolutionNote}</p>
              </div>
            )}

            {issue.status !== "resolved" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {issue.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-mono"
                    data-testid={`button-start-${issue.id}`}
                    onClick={() => update.mutate({ status: "in_progress" })}
                    disabled={update.isPending}
                  >
                    対応開始
                  </Button>
                )}
                <div className="flex gap-2 flex-1">
                  <Textarea
                    placeholder="解決メモ（アキへ通知されます）"
                    className="text-xs font-mono min-h-[60px]"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    data-testid={`input-resolution-${issue.id}`}
                  />
                  <Button
                    size="sm"
                    className="text-xs font-mono shrink-0"
                    data-testid={`button-resolve-${issue.id}`}
                    onClick={() => update.mutate({ status: "resolved", resolutionNote })}
                    disabled={update.isPending}
                  >
                    解決済み
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateIssueDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("DORAMI");
  const [reporter, setReporter] = useState("DORAMI");

  const create = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dev-issues", { title, description, priority, assignedTo, reporter }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dev-issues"] });
      toast({ title: "Issue作成しました" });
      setTitle(""); setDescription(""); setPriority("medium");
      onClose();
    },
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-mono">新規Issue</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <Input
          placeholder="タイトル"
          className="font-mono text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="input-issue-title"
        />
        <Textarea
          placeholder="詳細（何が起きているか、再現手順など）"
          className="font-mono text-sm min-h-[100px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          data-testid="input-issue-description"
        />
        <div className="flex gap-2">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="font-mono text-sm" data-testid="select-priority">
              <SelectValue placeholder="優先度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="low">低</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger className="font-mono text-sm" data-testid="select-assigned">
              <SelectValue placeholder="担当" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DORAMI">DORAMI</SelectItem>
              <SelectItem value="アキ">アキ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Select value={reporter} onValueChange={setReporter}>
            <SelectTrigger className="font-mono text-sm" data-testid="select-reporter">
              <SelectValue placeholder="報告者" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DORAMI">DORAMI</SelectItem>
              <SelectItem value="あさひ">あさひ</SelectItem>
              <SelectItem value="アキ">アキ</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="flex-1 font-mono text-sm"
            onClick={() => create.mutate()}
            disabled={!title || !description || create.isPending}
            data-testid="button-create-issue"
          >
            作成
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export default function DevIssues() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: issues, isLoading } = useQuery<DevIssue[]>({
    queryKey: ["/api/dev-issues"],
  });

  const filtered = issues?.filter((i) => filterStatus === "all" || i.status === filterStatus);
  const openCount = issues?.filter((i) => i.status === "open").length ?? 0;
  const inProgressCount = issues?.filter((i) => i.status === "in_progress").length ?? 0;

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-mono font-bold" data-testid="text-page-title">Dev Issues</h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            DORAMI ↔ アキ 共有issueキュー
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono" data-testid="button-new-issue">
              <Plus className="w-4 h-4 mr-1" />
              新規Issue
            </Button>
          </DialogTrigger>
          <CreateIssueDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      <div className="flex gap-3 font-mono text-sm">
        <span className="text-red-400">未対応: {openCount}</span>
        <span className="text-blue-400">対応中: {inProgressCount}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "open", "in_progress", "resolved"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filterStatus === s ? "default" : "outline"}
            className="font-mono text-xs"
            onClick={() => setFilterStatus(s)}
            data-testid={`button-filter-${s}`}
          >
            {{ all: "すべて", open: "未対応", in_progress: "対応中", resolved: "解決済み" }[s]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center font-mono text-muted-foreground py-8">読み込み中...</div>
      ) : filtered?.length === 0 ? (
        <div className="text-center font-mono text-muted-foreground py-8">issueはありません</div>
      ) : (
        <div className="space-y-3">
          {filtered?.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
        </div>
      )}

      <div className="border-t border-border/30 pt-4">
        <p className="font-mono text-xs text-muted-foreground">
          アキからの外部投稿: <code className="bg-muted px-1 rounded">POST /api/dev-issues/external</code>（QA_AGENT_TOKENで認証）
        </p>
      </div>
    </div>
  );
}
