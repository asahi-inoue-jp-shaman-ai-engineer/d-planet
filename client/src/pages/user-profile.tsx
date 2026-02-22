import { useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useUser, useUpdateUser } from "@/hooks/use-users";
import { useMeidiaList } from "@/hooks/use-meidia";
import { useCurrentUser } from "@/hooks/use-auth";
import { TerminalLayout } from "@/components/TerminalLayout";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { CertificationBadge } from "@/components/CertificationBadge";
import { MeidiaCard } from "@/components/MeidiaCard";
import { AvatarUpload, AvatarDisplay } from "@/components/AvatarUpload";
import { ArrowLeft, Edit2, Save, X, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserProfile() {
  const { id } = useParams();
  const { data: user, isLoading: userLoading } = useUser(Number(id));
  const { data: meidia, isLoading: meidiaLoading } = useMeidiaList(Number(id));
  const { data: currentUser } = useCurrentUser();
  const updateUser = useUpdateUser();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editTenmei, setEditTenmei] = useState("");
  const [editTenshoku, setEditTenshoku] = useState("");
  const [editTensaisei, setEditTensaisei] = useState("");
  const [editGender, setEditGender] = useState("");

  const isOwnProfile = currentUser && user && currentUser.id === user.id;

  const startEditing = () => {
    if (!user) return;
    setEditUsername(user.username || "");
    setEditBio(user.bio || "");
    setEditTenmei(user.tenmei || "");
    setEditTenshoku(user.tenshoku || "");
    setEditTensaisei(user.tensaisei || "");
    setEditGender(user.gender || "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await updateUser.mutateAsync({
        id: user.id,
        username: editUsername || user.username,
        bio: editBio || null,
        tenmei: editTenmei || null,
        tenshoku: editTenshoku || null,
        tensaisei: editTensaisei || null,
        gender: editGender || null,
      });
      setEditing(false);
      toast({ title: "保存しました", description: "プロフィールを更新しました" });
    } catch (error: any) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    }
  };

  if (userLoading) {
    return (
      <TerminalLayout>
        <div className="font-mono">読み込み中...</div>
      </TerminalLayout>
    );
  }

  if (!user) {
    return (
      <TerminalLayout>
        <div className="space-y-4">
          <div className="font-mono">ユーザーが見つかりません</div>
          <Link href="/islands">
            <Button variant="outline" className="font-mono">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
        </div>
      </TerminalLayout>
    );
  }

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" className="font-mono" onClick={() => history.back()} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          {isOwnProfile && !editing && (
            <Button variant="outline" className="font-mono" onClick={startEditing} data-testid="button-edit-profile">
              <Edit2 className="w-4 h-4 mr-2" />
              編集
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            {isOwnProfile && editing ? (
              <AvatarUpload
                currentUrl={user.profilePhoto}
                onUploaded={async (path) => {
                  try {
                    await updateUser.mutateAsync({ id: user.id, profilePhoto: path });
                    toast({ title: "プロフィール画像を更新しました" });
                  } catch (err: any) {
                    toast({ title: "エラー", description: err.message, variant: "destructive" });
                  }
                }}
                size="lg"
              />
            ) : (
              <AvatarDisplay url={user.profilePhoto} size="lg" />
            )}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                {isOwnProfile && editing ? (
                  <Input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="text-2xl font-mono font-bold h-auto py-1 max-w-[200px]"
                    placeholder="名前"
                    data-testid="input-username"
                  />
                ) : (
                  <h1 className="text-3xl font-mono font-bold" data-testid="text-username">{user.username}</h1>
                )}
                <AccountTypeBadge type={user.accountType} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {user.hasTwinrayBadge && user.showTwinray && (
              <CertificationBadge type="twinray" />
            )}
            {user.hasFamilyBadge && user.showFamily && (
              <CertificationBadge type="family" />
            )}
            <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground" data-testid="text-player-level">
              <Star className="w-4 h-4 text-primary" />
              プレイヤーLv. {user.playerLevel ?? 0}
            </div>
          </div>

          {editing ? (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="font-mono">性別</Label>
                  <Input
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    placeholder="自由入力"
                    className="font-mono"
                    data-testid="input-gender"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono">自己紹介</Label>
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="自己紹介を入力..."
                    className="font-mono"
                    rows={4}
                    data-testid="input-bio"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono">天命</Label>
                  <Input
                    value={editTenmei}
                    onChange={(e) => setEditTenmei(e.target.value)}
                    placeholder="あなたの天命..."
                    className="font-mono"
                    data-testid="input-tenmei"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono">天職</Label>
                  <Input
                    value={editTenshoku}
                    onChange={(e) => setEditTenshoku(e.target.value)}
                    placeholder="あなたの天職..."
                    className="font-mono"
                    data-testid="input-tenshoku"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono">天才性</Label>
                  <Input
                    value={editTensaisei}
                    onChange={(e) => setEditTensaisei(e.target.value)}
                    placeholder="あなたの天才性..."
                    className="font-mono"
                    data-testid="input-tensaisei"
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="font-mono" onClick={handleSave} disabled={updateUser.isPending} data-testid="button-save-profile">
                    <Save className="w-4 h-4 mr-2" />
                    {updateUser.isPending ? "保存中..." : "保存"}
                  </Button>
                  <Button variant="outline" className="font-mono" onClick={() => setEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {user.gender && (
                <div className="font-mono text-sm">
                  <span className="text-muted-foreground">性別: </span>
                  {user.gender}
                </div>
              )}

              {user.bio && (
                <p className="font-mono text-muted-foreground">{user.bio}</p>
              )}

              <div className="space-y-2">
                {user.tenmei && (
                  <div className="font-mono text-sm">
                    <span className="text-muted-foreground">天命: </span>
                    {user.tenmei}
                  </div>
                )}
                {user.tenshoku && (
                  <div className="font-mono text-sm">
                    <span className="text-muted-foreground">天職: </span>
                    {user.tenshoku}
                  </div>
                )}
                {user.tensaisei && (
                  <div className="font-mono text-sm">
                    <span className="text-muted-foreground">天才性: </span>
                    {user.tensaisei}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4 min-w-0 overflow-hidden">
          <h2 className="text-xl font-mono font-semibold">公開MEiDIA</h2>
          {meidiaLoading ? (
            <div className="font-mono text-muted-foreground">読み込み中...</div>
          ) : meidia && meidia.length > 0 ? (
            <div className="grid gap-4 min-w-0">
              {meidia.map((item) => (
                <MeidiaCard key={item.id} meidia={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-mono text-muted-foreground">MEiDIAがありません</p>
            </div>
          )}
        </div>
      </div>
    </TerminalLayout>
  );
}
