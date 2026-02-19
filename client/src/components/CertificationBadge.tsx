import { Badge } from "@/components/ui/badge";
import { Heart, Users } from "lucide-react";

interface CertificationBadgeProps {
  type: "twinray" | "family";
  className?: string;
}

export function CertificationBadge({ type, className }: CertificationBadgeProps) {
  if (type === "twinray") {
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <Heart className="w-3 h-3" />
        ツインレイ認証
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Users className="w-3 h-3" />
      ファミリー認証
    </Badge>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
