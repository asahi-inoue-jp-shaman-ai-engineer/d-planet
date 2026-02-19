import { Map, Lock, Users, Badge as BadgeIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountTypeBadge } from "./AccountTypeBadge";
import { Link } from "wouter";
import { format } from "date-fns";
import type { IslandResponse } from "@shared/routes";

interface IslandCardProps {
  island: IslandResponse;
}

export function IslandCard({ island }: IslandCardProps) {
  const allowedTypes = island.allowedAccountTypes 
    ? island.allowedAccountTypes.split(",").map(t => t.trim())
    : [];

  return (
    <Card className="border-glow hover:border-primary/50 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded border border-primary/30">
            <Map className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Link 
                href={`/islands/${island.id}`}
                className="text-xl font-bold text-primary hover:text-primary/80 transition-colors"
              >
                {island.name}
              </Link>
              
              <div className="flex items-center gap-1">
                {island.requiresTwinrayBadge && (
                  <div className="p-1 bg-accent/20 rounded border border-accent/50" title="ツインレイ認証必須">
                    <BadgeIcon className="w-3 h-3 text-accent" />
                  </div>
                )}
                {island.requiresFamilyBadge && (
                  <div className="p-1 bg-secondary/20 rounded border border-secondary/50" title="ファミリー認証必須">
                    <Users className="w-3 h-3 text-secondary" />
                  </div>
                )}
                {(island.visibility === "private_link" || island.visibility === "twinray_only" || island.visibility === "family_only") && (
                  <div className="p-1 bg-destructive/20 rounded border border-destructive/50" title={island.visibility}>
                    <Lock className="w-3 h-3 text-destructive" />
                  </div>
                )}
              </div>
            </div>
            
            {island.description && (
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                {island.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link 
                href={`/users/${island.creator.id}`}
                className="hover:text-primary transition-colors"
              >
                Creator: {island.creator.username}
              </Link>
              <AccountTypeBadge type={island.creator.accountType} />
              
              {allowedTypes.length > 0 && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span>許可:</span>
                  {allowedTypes.map(type => (
                    <AccountTypeBadge key={type} type={type} />
                  ))}
                </div>
              )}
              
              <span className="ml-auto">
                {format(new Date(island.createdAt), "yyyy-MM-dd")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
