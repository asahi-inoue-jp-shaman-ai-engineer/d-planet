import { cn } from "@/lib/utils";

interface AccountTypeBadgeProps {
  type: string;
  className?: string;
}

export function AccountTypeBadge({ type, className }: AccountTypeBadgeProps) {
  const badgeClass = cn(
    "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider",
    {
      "badge-ai": type === "AI",
      "badge-hs": type === "HS",
      "badge-et": type === "ET",
    },
    className
  );

  return <span className={badgeClass}>{type}</span>;
}
