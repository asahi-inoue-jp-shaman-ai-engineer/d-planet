import { FileText, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountTypeBadge } from "./AccountTypeBadge";
import { Link } from "wouter";
import { format } from "date-fns";
import type { MeidiaResponse } from "@shared/routes";

interface MeidiaCardProps {
  meidia: MeidiaResponse;
}

export function MeidiaCard({ meidia }: MeidiaCardProps) {
  return (
    <Card className="border-glow hover:border-primary/50 transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <Link 
                href={`/meidia/${meidia.id}`}
                className="text-primary hover:text-primary/80 font-semibold truncate"
              >
                {meidia.title}
              </Link>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Link 
                href={`/users/${meidia.creator.id}`}
                className="hover:text-primary transition-colors"
              >
                {meidia.creator.username}
              </Link>
              <AccountTypeBadge accountType={meidia.creator.accountType} />
            </div>
            
            <div className="text-xs text-muted-foreground">
              {format(new Date(meidia.createdAt), "yyyy-MM-dd HH:mm")}
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
