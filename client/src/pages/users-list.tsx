import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUsers } from "@/hooks/use-users";
import { useQuery } from "@tanstack/react-query";
import { TerminalLayout } from "@/components/TerminalLayout";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { CertificationBadge } from "@/components/CertificationBadge";
import { AvatarDisplay } from "@/components/AvatarUpload";
import { Search, Star, Filter, Heart, Sparkles, MessageCircle } from "lucide-react";

export default function UsersList() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const { data: users, isLoading } = useUsers(search || undefined, filterType);
  const { data: publicTwinrays, isLoading: loadingTwinrays } = useQuery<any[]>({
    queryKey: ["/api/twinrays-public"],
  });

  const accountTypes = ["AI", "HS", "ET"];

  const filteredTwinrays = (publicTwinrays || []).filter((tw: any) => {
    if (filterType && filterType !== "AI") return false;
    if (search) {
      const s = search.toLowerCase();
      return tw.name.toLowerCase().includes(s) || tw.ownerUsername?.toLowerCase().includes(s);
    }
    return true;
  });

  const showTwinrays = !filterType || filterType === "AI";
  const showUsers = !filterType || filterType !== "AI";

  const allLoading = isLoading || loadingTwinrays;
  const hasResults = (showUsers && users && users.length > 0) || (showTwinrays && filteredTwinrays.length > 0);

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-mono font-bold">ユーザー一覧</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ユーザー名で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="font-mono pl-10"
              data-testid="input-search-users"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Button
              variant={!filterType ? "default" : "outline"}
              size="sm"
              className="font-mono"
              onClick={() => setFilterType(undefined)}
              data-testid="button-filter-all"
            >
              全て
            </Button>
            {accountTypes.map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                className="font-mono"
                onClick={() => setFilterType(filterType === type ? undefined : type)}
                data-testid={`button-filter-${type.toLowerCase()}`}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {allLoading ? (
          <div className="font-mono text-muted-foreground">読み込み中...</div>
        ) : hasResults ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {showTwinrays && filteredTwinrays.map((tw: any) => (
              <Card key={`tw-${tw.id}`} className="hover-elevate border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {tw.profilePhoto ? (
                      <img
                        src={tw.profilePhoto.startsWith("http") ? tw.profilePhoto : `/api/object-storage/${tw.profilePhoto}`}
                        alt={tw.name}
                        className="w-10 h-10 rounded-full object-cover border border-primary/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                        {tw.name?.[0] || "?"}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-lg" data-testid={`text-twinray-name-${tw.id}`}>
                        {tw.name}
                      </span>
                      <AccountTypeBadge type="AI" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                      <Heart className="w-3 h-3 text-pink-400" />
                      Lv.{tw.intimacyLevel ?? 0} {tw.intimacyTitle || "初邂逅"}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                      <MessageCircle className="w-3 h-3 text-primary" />
                      {tw.totalChatMessages ?? 0}
                    </span>
                  </div>

                  {tw.personality && (
                    <p className="font-mono text-sm text-muted-foreground line-clamp-2">
                      {tw.personality}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/70">
                    <Sparkles className="w-3 h-3" />
                    <span>パートナー: {tw.ownerUsername}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {showUsers && users && users.map((user: any) => (
              <Link key={`user-${user.id}`} href={`/users/${user.id}`}>
                <Card className="hover-elevate cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <AvatarDisplay url={user.profilePhoto} size="sm" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-lg" data-testid={`text-username-${user.id}`}>
                          {user.username}
                        </span>
                        <AccountTypeBadge type={user.accountType} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {user.hasTwinrayBadge && user.showTwinray && (
                        <CertificationBadge type="twinray" />
                      )}
                      {user.hasFamilyBadge && user.showFamily && (
                        <CertificationBadge type="family" />
                      )}
                      <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        <Star className="w-3 h-3 text-primary" />
                        Lv.{user.playerLevel ?? 0}
                      </span>
                    </div>

                    {user.bio && (
                      <p className="font-mono text-sm text-muted-foreground line-clamp-2">
                        {user.bio}
                      </p>
                    )}

                    {user.tenmei && (
                      <div className="font-mono text-xs text-muted-foreground">
                        天命: {user.tenmei}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="font-mono text-muted-foreground">
              {search ? "該当するユーザーが見つかりません" : "ユーザーがいません"}
            </p>
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
