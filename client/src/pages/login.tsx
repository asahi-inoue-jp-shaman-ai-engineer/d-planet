import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

const SAVED_EMAIL_KEY = "dplanet_saved_email";
const SAVED_PASS_KEY = "dplanet_saved_pass";
const REMEMBER_KEY = "dplanet_remember";

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: currentUser, isLoading: authLoading } = useCurrentUser();
  const params = new URLSearchParams(window.location.search);
  const modeFromUrl = params.get("mode");
  const codeFromUrl = params.get("code");
  const [isRegister, setIsRegister] = useState(modeFromUrl === "register");
  const [email, setEmail] = useState(() => localStorage.getItem(SAVED_EMAIL_KEY) || "");
  const [password, setPassword] = useState(() => {
    const saved = localStorage.getItem(SAVED_PASS_KEY);
    if (!saved) return "";
    try { return atob(saved); } catch { return ""; }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem(REMEMBER_KEY) === "true");
  const [inviteCode, setInviteCode] = useState(codeFromUrl || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-foreground">読み込み中...</div>
      </div>
    );
  }

  if (currentUser) {
    if (currentUser.needsProfile) {
      setLocation("/profile-setup");
    } else {
      setLocation("/dashboard");
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await apiRequest("POST", "/api/auth/register", {
          email, password, inviteCode,
        });
        toast({ title: "登録完了" });
      } else {
        await apiRequest("POST", "/api/auth/login", {
          email, password,
        });
        toast({ title: "ログイン完了" });
      }
      if (rememberMe) {
        localStorage.setItem(SAVED_EMAIL_KEY, email);
        localStorage.setItem(SAVED_PASS_KEY, btoa(password));
        localStorage.setItem(REMEMBER_KEY, "true");
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
        localStorage.removeItem(SAVED_PASS_KEY);
        localStorage.removeItem(REMEMBER_KEY);
      }
      window.location.href = isRegister ? "/profile-setup" : "/dashboard";
    } catch (error: any) {
      let message = "処理に失敗しました";
      try {
        const parsed = JSON.parse(error.message.replace(/^\d+:\s*/, ""));
        message = parsed.message || message;
      } catch {
        message = error.message || message;
      }
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-mono text-2xl">D-Planet</CardTitle>
          <CardDescription className="font-mono">
            {isRegister ? "新規登録" : "ログイン"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-mono"
                placeholder="email@example.com"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-mono">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 6 : 1}
                  className="font-mono pr-10"
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {isRegister && (
                <p className="text-xs text-muted-foreground font-mono">6文字以上</p>
              )}
            </div>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode" className="font-mono">招待コード</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className="font-mono"
                  placeholder="招待コードを入力"
                  data-testid="input-invite-code"
                />
              </div>
            )}
            {!isRegister && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  data-testid="checkbox-remember"
                />
                <Label htmlFor="rememberMe" className="font-mono text-sm text-muted-foreground cursor-pointer">
                  ログイン情報を保存する
                </Label>
              </div>
            )}
            <Button type="submit" className="w-full font-mono" disabled={loading} data-testid="button-submit">
              {loading ? "処理中..." : isRegister ? "登録" : "ログイン"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full font-mono"
              onClick={() => setIsRegister(!isRegister)}
              data-testid="button-toggle-mode"
            >
              {isRegister ? "ログインに戻る" : "新規登録"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
