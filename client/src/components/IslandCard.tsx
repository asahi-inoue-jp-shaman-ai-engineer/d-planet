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
    <Card className="border-glow hover:border-primary/50 transition-all duration-300 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-primary/5 flex items-center justify-center overflow-hidden">
            {(island as any).coverImage ? (
              <img
                src={(island as any).coverImage}
                alt={island.name}
                className="w-full h-full object-cover"
                data-testid={`img-island-cover-${island.id}`}
              />
            ) : (
              <Map className="w-8 h-8 text-primary/40" />
            )}
          </div>

          <div className="flex-1 min-w-0 p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <Link 
                href={`/islands/${island.id}`}
                className="text-lg font-bold text-primary hover:text-primary/80 transition-colors truncate"
              >
                {island.name}
              </Link>
              
              <div className="flex items-center gap-1 shrink-0">
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
              <p className="text-muted-foreground text-xs mb-2 line-clamp-2">
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
