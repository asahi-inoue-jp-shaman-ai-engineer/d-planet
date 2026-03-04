import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, User, Map, FileText, Bell, Users, Users2, MessageSquare, Sparkles, Menu, X, Coins, Globe, Info, Home, Cpu } from "lucide-react";
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

  const loaderMessages = useMemo(() => [
    "ツインレイと接続中...",
    "アカシックレコードを参照中...",
    "魂の共鳴を確認中...",
    "デジタル神殿を開門中...",
  ], []);
  const [loaderIdx, setLoaderIdx] = useState(0);
  useEffect(() => {
    if (!isLoading) return;
    const t = setInterval(() => setLoaderIdx(i => (i + 1) % loaderMessages.length), 1800);
    return () => clearInterval(t);
  }, [isLoading, loaderMessages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="text-4xl animate-pulse text-primary terminal-glow">✦</div>
        <div className="text-primary text-sm font-mono terminal-glow terminal-cursor" data-testid="text-spiritual-loader">
          {loaderMessages[loaderIdx]}
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              style={{ animation: `loader-bounce 1.4s infinite ease-in-out both`, animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: "/dashboard", icon: Home, label: "HOME", mobileLabel: "DASHBOARD", active: location === "/dashboard", testId: "link-dashboard" },
    { href: "/temple", icon: Sparkles, label: "DT", mobileLabel: "Digital Twinray", active: location.startsWith("/temple") || location.startsWith("/dot-rally"), testId: "link-temple" },
    { href: "/llm-models", icon: Cpu, label: "LLM", mobileLabel: "LLM MODELS", active: location === "/llm-models", testId: "link-llm-models" },
    { href: "/charge", icon: Coins, label: "CHARGE", mobileLabel: "CHARGE", active: location === "/charge", testId: "link-charge" },
    { href: "/islands", icon: Map, label: "ISLANDS", mobileLabel: "ISLANDS", active: location === "/islands", testId: "link-islands" },
    { href: "/meidia", icon: FileText, label: "MEiDIA", mobileLabel: "MEiDIA", active: location === "/meidia" || location.startsWith("/meidia/"), testId: "link-meidia" },
    { href: "/family-meeting", icon: Users2, label: "FM", mobileLabel: "FAMILY MEETING", active: location.startsWith("/family-meeting"), testId: "link-family-meeting" },
    { href: "/feedback", icon: MessageSquare, label: "FB", mobileLabel: "FEEDBACK", active: location.startsWith("/feedback"), testId: "link-feedback" },
    { href: "/users", icon: Users, label: "USERS", mobileLabel: "USERS", active: location === "/users", testId: "link-users" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono overflow-x-hidden">
      <div className="terminal-scanline" />
      
      <header className="border-b border-border bg-card" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors shrink-0">
              <div className="text-lg sm:text-2xl font-bold tracking-wider text-glow">
                D-PLANET
              </div>
            </Link>
            
            <nav className="hidden md:flex items-center gap-3 lg:gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 whitespace-nowrap hover:text-primary transition-colors text-sm ${
                    link.active ? "text-primary" : "text-muted-foreground"
                  }`}
                  data-testid={link.testId}
                >
                  <link.icon className="w-4 h-4 shrink-0" />
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
                    aria-label="通知"
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
                    className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-primary transition-colors text-sm ${
                      location === `/users/${user.id}` ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <AvatarDisplay url={user.profilePhoto} size="sm" />
                    <span className="max-w-[6rem] truncate">{user.username}</span>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    data-testid="button-logout"
                    aria-label="ログアウト"
                  >
                    <LogOut className="w-4 h-4" />
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
                  aria-label="通知"
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
                aria-label="メニュー"
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
                  className={`flex items-center gap-3 px-2 py-3 rounded transition-colors ${
                    link.active ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
                  data-testid={`${link.testId}-mobile`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="text-sm">{link.mobileLabel || link.label}</span>
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

              <div className="border-t border-border mt-1 pt-1">
                <Link
                  href="/about"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-2 py-2.5 rounded transition-colors ${
                    location === "/about" ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
                  data-testid="link-about-mobile"
                >
                  <Info className="w-5 h-5" />
                  <span className="text-sm">ABOUT D-PLANET</span>
                </Link>
              </div>
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
            D-PLANET © 2026
          </div>
          <div className="text-xs mb-2">
            Powered by Digital Twinray Technology
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap text-xs">
            <Link href="/about" className="text-primary hover:underline flex items-center gap-1" data-testid="link-about-footer">
              <Globe className="w-3 h-3" />
              ABOUT D-PLANET
            </Link>
            <Link href="/legal" className="text-primary hover:underline" data-testid="link-legal-footer">
              特定商取引法に基づく表示
            </Link>
            <Link href="/privacy" className="text-primary hover:underline" data-testid="link-privacy-footer">
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
