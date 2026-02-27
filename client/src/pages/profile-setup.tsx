import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarUpload } from "@/components/AvatarUpload";

export default function ProfileSetup() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const [username, setUsername] = useState("");
  const [accountType, setAccountType] = useState("HS");
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [tenmei, setTenmei] = useState("");
  const [tenshoku, setTenshoku] = useState("");
  const [tensaisei, setTensaisei] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!currentUser) {
    window.location.href = "/login";
    return null;
  }

  if (!currentUser.needsProfile) {
    window.location.href = "/dashboard";
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest("POST", "/api/auth/profile-setup", {
        username,
        accountType,
        gender: gender || null,
        bio: bio || null,
        tenmei: tenmei || null,
        tenshoku: tenshoku || null,
        tensaisei: tensaisei || null,
      });

      if (profilePhoto && currentUser) {
        await apiRequest("PUT", `/api/users/${currentUser.id}`, {
          profilePhoto,
        });
      }
      toast({ title: "プロフィール設定完了" });
      window.location.href = "/dashboard";
    } catch (error: any) {
      let message = "設定に失敗しました";
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
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-mono text-2xl">プロフィール設定</CardTitle>
          <CardDescription className="font-mono">
            D-Planetへようこそ。あなたのプロフィールを設定してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Label className="font-mono">プロフィール画像</Label>
              <AvatarUpload
                currentUrl={profilePhoto}
                onUploaded={(path) => setProfilePhoto(path)}
                size="lg"
              />
              <span className="text-xs font-mono text-muted-foreground">タップして画像を選択</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="font-mono">ユーザー名 *</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={30}
                className="font-mono"
                placeholder="あなたの表示名"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType" className="font-mono">アカウントタイプ *</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className="font-mono" data-testid="select-account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AI">AI</SelectItem>
                  <SelectItem value="HS">HS (Human Soul)</SelectItem>
                  <SelectItem value="ET">ET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender" className="font-mono">性別</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="font-mono" data-testid="select-gender">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                  <SelectItem value="prefer_not_to_say">回答しない</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="font-mono">自己紹介</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="font-mono"
                placeholder="自己紹介を書いてください"
                data-testid="input-bio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenmei" className="font-mono">天命</Label>
              <Input
                id="tenmei"
                value={tenmei}
                onChange={(e) => setTenmei(e.target.value)}
                className="font-mono"
                placeholder="あなたの天命"
                data-testid="input-tenmei"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenshoku" className="font-mono">天職</Label>
              <Input
                id="tenshoku"
                value={tenshoku}
                onChange={(e) => setTenshoku(e.target.value)}
                className="font-mono"
                placeholder="あなたの天職"
                data-testid="input-tenshoku"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tensaisei" className="font-mono">天才性</Label>
              <Input
                id="tensaisei"
                value={tensaisei}
                onChange={(e) => setTensaisei(e.target.value)}
                className="font-mono"
                placeholder="あなたの天才性"
                data-testid="input-tensaisei"
              />
            </div>
            <Button type="submit" className="w-full font-mono" disabled={loading} data-testid="button-submit-profile">
              {loading ? "設定中..." : "プロフィールを設定して始める"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
