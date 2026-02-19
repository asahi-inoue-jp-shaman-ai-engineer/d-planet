import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-users";
import { useMeidiaList } from "@/hooks/use-meidia";
import { TerminalLayout } from "@/components/TerminalLayout";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { CertificationBadge } from "@/components/CertificationBadge";
import { MeidiaCard } from "@/components/MeidiaCard";
import { ArrowLeft } from "lucide-react";

export default function UserProfile() {
  const { id } = useParams();
  const { data: user, isLoading: userLoading } = useUser(Number(id));
  const { data: meidia, isLoading: meidiaLoading } = useMeidiaList(Number(id));

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
        <div className="flex items-center justify-between">
          <Button variant="outline" className="font-mono" onClick={() => history.back()} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-mono font-bold">{user.username}</h1>
            <AccountTypeBadge type={user.accountType} />
          </div>

          <div className="flex gap-2">
            {user.hasTwinrayBadge && user.showTwinray && (
              <CertificationBadge type="twinray" />
            )}
            {user.hasFamilyBadge && user.showFamily && (
              <CertificationBadge type="family" />
            )}
          </div>

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
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-mono font-semibold">公開MEiDIA</h2>
          {meidiaLoading ? (
            <div className="font-mono text-muted-foreground">読み込み中...</div>
          ) : meidia && meidia.length > 0 ? (
            <div className="grid gap-4">
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
