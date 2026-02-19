import { Link, useLocation } from "wouter";
import { Home, Users, FileText, UserCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { AccountTypeBadge } from "./AccountTypeBadge";

export function TerminalHeader() {
  const [location] = useLocation();
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) return null;

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/islands">
              <span className="text-primary font-bold text-lg terminal-glow cursor-pointer hover:text-accent">
                D-PLANET
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/islands">
                <Button
                  variant={location === "/islands" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  アイランド
                </Button>
              </Link>
              <Link href="/meidia">
                <Button
                  variant={location === "/meidia" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  MEiDIA
                </Button>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <UserCircle className="w-4 h-4" />
                {user.username}
              </Button>
            </Link>
            <AccountTypeBadge type={user.accountType} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
