import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, User, Map, FileText, Home, Bell, Users, MessageSquare, Sparkles } from "lucide-react";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { useUnreadCount } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TerminalLayoutProps {
  children: ReactNode;
}

export function TerminalLayout({ children }: TerminalLayoutProps) {
  const [location] = useLocation();
  const { data: user, isLoading } = useCurrentUser();
  const { data: unreadData } = useUnreadCount();
  const logout = useLogout();
  const { toast } = useToast();
  const unreadCount = unreadData?.count ?? 0;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "ログアウトしました",
          description: "またのご利用をお待ちしております",
        });
        window.location.replace("/login");
      },
      onError: (error) => {
        toast({
          title: "エラー",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl font-mono">
          <span className="terminal-cursor">LOADING</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="terminal-scanline" />
      
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/islands" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
              <div className="text-2xl font-bold tracking-wider text-glow">
                D-PLANET
              </div>
              <div className="text-xs text-muted-foreground">v1.0.0-alpha</div>
            </Link>
            
            <nav className="flex items-center gap-6">
              <Link 
                href="/islands" 
                className={`flex items-center gap-2 hover:text-primary transition-colors ${
                  location === "/islands" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Map className="w-4 h-4" />
                <span className="hidden sm:inline">ISLANDS</span>
              </Link>
              
              <Link 
                href="/meidia" 
                className={`flex items-center gap-2 hover:text-primary transition-colors ${
                  location === "/meidia" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">MEiDIA</span>
              </Link>

              <Link 
                href="/users" 
                className={`flex items-center gap-2 hover:text-primary transition-colors ${
                  location === "/users" ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid="link-users"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">USERS</span>
              </Link>

              <Link
                href="/temple"
                className={`flex items-center gap-2 hover:text-primary transition-colors ${
                  location.startsWith("/temple") || location.startsWith("/dot-rally") ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid="link-temple"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">神殿</span>
              </Link>

              <Link
                href="/feedback"
                className={`flex items-center gap-2 hover:text-primary transition-colors ${
                  location.startsWith("/feedback") ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid="link-feedback"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">FB</span>
              </Link>
              
              {user && (
                <>
                  <Link 
                    href="/notifications" 
                    className={`relative flex items-center gap-2 hover:text-primary transition-colors ${
                      location === "/notifications" ? "text-primary" : "text-muted-foreground"
                    }`}
                    data-testid="link-notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" data-testid="badge-unread-count">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>

                  <Link 
                    href={`/users/${user.id}`}
                    className={`flex items-center gap-2 hover:text-primary transition-colors ${
                      location === `/users/${user.id}` ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user.username}</span>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">LOGOUT</span>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
          <div className="mb-2">
            D-PLANET © 2025 - Phase 1 Alpha
          </div>
          <div className="text-xs">
            Powered by Digital Twinray Technology
          </div>
        </div>
      </footer>
    </div>
  );
}
