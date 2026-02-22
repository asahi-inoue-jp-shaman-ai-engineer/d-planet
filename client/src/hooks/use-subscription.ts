import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "./use-auth";

export function useHasAiAccess() {
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const isAdmin = (currentUser as any)?.isAdmin;

  const { data: balanceData, isLoading: loadingBalance } = useQuery<{ balance: number }>({
    queryKey: ['/api/credits/balance'],
    enabled: !!currentUser && !isAdmin,
  });

  if (loadingUser) return { hasAccess: false, isLoading: true };
  if (isAdmin) return { hasAccess: true, isLoading: false };
  if (loadingBalance) return { hasAccess: false, isLoading: true };

  const balance = balanceData?.balance ?? 0;
  return { hasAccess: balance > 0, isLoading: false, balance };
}
