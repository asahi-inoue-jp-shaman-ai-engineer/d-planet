import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = params.get("code");
  const [isRegister, setIsRegister] = useState(!!codeFromUrl);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState("HS");
  const [inviteCode, setInviteCode] = useState(codeFromUrl || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="font-mono"
                data-testid="input-password"
              />
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
                <div className="space-y-2">
                  <Label htmlFor="inviteCode" className="font-mono">招待コード</Label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    className="font-mono"
                    placeholder="DPLANET-1-GENESIS"
                    data-testid="input-invite-code"
                  />
                </div>
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
