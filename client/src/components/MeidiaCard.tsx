import { useState } from "react";
import { FileText, Download, Tag, Trash2, Globe, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountTypeBadge } from "./AccountTypeBadge";
import { Link } from "wouter";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/use-auth";
import { useDeleteMeidia } from "@/hooks/use-meidia";
import { useToast } from "@/hooks/use-toast";
import type { MeidiaResponse } from "@shared/routes";

interface MeidiaCardProps {
  meidia: MeidiaResponse;
  showVisibility?: boolean;
}

export function MeidiaCard({ meidia, showVisibility }: MeidiaCardProps) {
  const tags = meidia.tags ? meidia.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const { data: user } = useCurrentUser();
  const deleteMeidia = useDeleteMeidia();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = user?.id === meidia.creator.id;
  const canDelete = isOwner || user?.isAdmin;

  const handleDelete = () => {
    deleteMeidia.mutate(meidia.id, {
      onSuccess: () => {
        toast({ title: "MEiDIAを削除しました" });
        setConfirmDelete(false);
      },
      onError: () => {
        toast({ title: "削除に失敗しました", variant: "destructive" });
      },
    });
  };

  return (
    <Card className="border-glow hover:border-primary/50 transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-2 min-w-0">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <Link 
                    href={`/meidia/${meidia.id}`}
                    className="text-primary hover:text-primary/80 font-semibold break-words block"
                  >
                    {meidia.title}
                  </Link>
                </div>
                {meidia.meidiaType === 'report' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-400 flex-shrink-0 no-default-active-elevate" data-testid={`badge-meidia-type-${meidia.id}`}>
                    レポ
                  </Badge>
                )}
                {meidia.meidiaType === 'activity' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-500/50 text-cyan-400 flex-shrink-0 no-default-active-elevate" data-testid={`badge-meidia-type-${meidia.id}`}>
                    島
                  </Badge>
                )}
                {showVisibility && (
                  meidia.isPublic ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-400 flex-shrink-0 no-default-active-elevate gap-0.5" data-testid={`badge-visibility-${meidia.id}`}>
                      <Globe className="w-2.5 h-2.5" />公開
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-500/50 text-zinc-400 flex-shrink-0 no-default-active-elevate gap-0.5" data-testid={`badge-visibility-${meidia.id}`}>
                      <Lock className="w-2.5 h-2.5" />非公開
                    </Badge>
                  )
                )}
              </div>
            </div>

            {meidia.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {meidia.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Link 
                href={`/users/${meidia.creator.id}`}
                className="hover:text-primary transition-colors"
              >
                {meidia.creator.username}
              </Link>
              <AccountTypeBadge type={meidia.creator.accountType} />
            </div>

            {tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mb-2">
                <Tag className="w-3 h-3 text-muted-foreground" />
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="font-mono text-xs no-default-active-elevate">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {format(new Date(meidia.createdAt), "yyyy-MM-dd HH:mm")}
              </div>
              {canDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleDelete}
                      disabled={deleteMeidia.isPending}
                      data-testid={`button-confirm-delete-meidia-${meidia.id}`}
                    >
                      {deleteMeidia.isPending ? "削除中..." : "削除する"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setConfirmDelete(false)}
                      data-testid={`button-cancel-delete-meidia-${meidia.id}`}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    data-testid={`button-delete-meidia-${meidia.id}`}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    削除
                  </Button>
                )
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Download className="w-3 h-3" />
            <span>{meidia.downloadCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
