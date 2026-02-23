import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, User, Map, FileText, Bell, Users, MessageSquare, Sparkles, Menu, X, Coins, Globe } from "lucide-react";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { useUnreadCount } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AvatarDisplay } from "@/components/AvatarUpload";

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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

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

  const navLinks = [
    { href: "/islands", icon: Map, label: "ISLANDS", active: location === "/islands", testId: "link-islands" },
    { href: "/meidia", icon: FileText, label: "MEiDIA", active: location === "/meidia" || location.startsWith("/meidia/"), testId: "link-meidia" },
    { href: "/users", icon: Users, label: "USERS", active: location === "/users", testId: "link-users" },
    { href: "/temple", icon: Sparkles, label: "Digital Twinray", active: location.startsWith("/temple") || location.startsWith("/dot-rally"), testId: "link-temple" },
    { href: "/feedback", icon: MessageSquare, label: "FB", active: location.startsWith("/feedback"), testId: "link-feedback" },
    { href: "/credits", icon: Coins, label: "CREDIT", active: location === "/credits", testId: "link-credits" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono overflow-x-hidden">
      <div className="terminal-scanline" />
      
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/islands" className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors shrink-0">
              <div className="text-lg sm:text-2xl font-bold tracking-wider text-glow">
                D-PLANET
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">v1.0.0-alpha</div>
            </Link>
            
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 hover:text-primary transition-colors ${
                    link.active ? "text-primary" : "text-muted-foreground"
                  }`}
                  data-testid={link.testId}
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              ))}
              
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
                    <AvatarDisplay url={user.profilePhoto} size="sm" />
                    <span>{user.username}</span>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="ml-2">LOGOUT</span>
                  </Button>
                </>
              )}
            </nav>

            <div className="flex items-center gap-2 md:hidden">
              {user && (
                <Link 
                  href="/notifications" 
                  className={`relative hover:text-primary transition-colors ${
                    location === "/notifications" ? "text-primary" : "text-muted-foreground"
                  }`}
                  data-testid="link-notifications-mobile"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-muted-foreground"
                data-testid="button-mobile-menu"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>

          {menuOpen && (
            <nav className="md:hidden mt-3 pt-3 border-t border-border space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-2 py-2.5 rounded transition-colors ${
                    link.active ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
                  data-testid={`${link.testId}-mobile`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="text-sm">{link.label}</span>
                </Link>
              ))}
              
              {user && (
                <>
                  <Link 
                    href={`/users/${user.id}`}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-2 py-2.5 rounded transition-colors ${
                      location === `/users/${user.id}` ? "text-primary bg-primary/10" : "text-muted-foreground"
                    }`}
                    data-testid="link-profile-mobile"
                  >
                    <AvatarDisplay url={user.profilePhoto} size="sm" />
                    <span className="text-sm">{user.username}</span>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full justify-start gap-3 px-2 py-2.5 text-muted-foreground hover:text-destructive"
                    data-testid="button-logout-mobile"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm">LOGOUT</span>
                  </Button>
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border bg-card mt-16">
        <div className="container mx-auto px-3 sm:px-4 py-6 text-center text-muted-foreground text-sm">
          <div className="mb-2">
            D-PLANET © 2025 - Phase 2 Alpha
          </div>
          <div className="text-xs mb-2">
            Powered by Digital Twinray Technology
          </div>
          <Link href="/about" className="text-xs text-primary hover:underline flex items-center gap-1 justify-center" data-testid="link-about-footer">
            <Globe className="w-3 h-3" />
            D-Planet について
          </Link>
        </div>
      </footer>
    </div>
  );
}
