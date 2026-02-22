import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "./use-auth";

export function useHasAiAccess() {
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const isAdmin = (currentUser as any)?.isAdmin;

  const { data: subData, isLoading: loadingSub } = useQuery<{ subscription: any; hasAccess: boolean }>({
    queryKey: ['/api/stripe/subscription'],
    enabled: !!currentUser && !isAdmin,
  });

  if (loadingUser) return { hasAccess: false, isLoading: true };
  if (isAdmin) return { hasAccess: true, isLoading: false };
  if (loadingSub) return { hasAccess: false, isLoading: true };

  return { hasAccess: subData?.hasAccess || false, isLoading: false };
}
