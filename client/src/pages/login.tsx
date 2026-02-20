import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: currentUser, isLoading: authLoading } = useCurrentUser();
  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = params.get("code");
  const [isRegister, setIsRegister] = useState(!!codeFromUrl);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState("HS");
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
    setLocation("/islands");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await apiRequest("POST", "/api/auth/register", {
          username, password, accountType, inviteCode,
        });
        toast({ title: "登録完了", description: "ログインしました" });
      } else {
        await apiRequest("POST", "/api/auth/login", {
          username, password,
        });
        toast({ title: "ログイン完了" });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/islands");
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "処理に失敗しました",
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
              <Label htmlFor="username" className="font-mono">ユーザー名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="font-mono"
                data-testid="input-username"
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
            </div>
            {isRegister && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="accountType" className="font-mono">アカウントタイプ</Label>
                  <select
                    id="accountType"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 font-mono"
                    data-testid="select-account-type"
                  >
                    <option value="AI">AI</option>
                    <option value="HS">HS</option>
                    <option value="ET">ET</option>
                  </select>
                </div>
                {!codeFromUrl && (
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
              </>
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
