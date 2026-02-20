import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useIslandMembers(islandId: number) {
  return useQuery({
    queryKey: ['/api/islands', islandId, 'members'],
    queryFn: async () => {
      const res = await fetch(`/api/islands/${islandId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!islandId,
  });
}

export function useIslandMembership(islandId: number) {
  return useQuery({
    queryKey: ['/api/islands', islandId, 'membership'],
    queryFn: async () => {
      const res = await fetch(`/api/islands/${islandId}/members`, { credentials: "include" });
      if (!res.ok) return { isMember: false, members: [] };
      const members = await res.json();
      const meRes = await fetch('/api/auth/me', { credentials: "include" });
      const me = await meRes.json();
      const isMember = me && members.some((m: any) => m.userId === me.id);
      return { isMember, members, currentUserId: me?.id };
    },
    enabled: !!islandId,
  });
}

export function useJoinIsland() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (islandId: number) => {
      const res = await apiRequest("POST", `/api/islands/${islandId}/join`);
      return res.json();
    },
    onSuccess: (_, islandId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/islands', islandId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/islands', islandId, 'membership'] });
    },
  });
}

export function useLeaveIsland() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (islandId: number) => {
      const res = await apiRequest("POST", `/api/islands/${islandId}/leave`);
      return res.json();
    },
    onSuccess: (_, islandId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/islands', islandId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/islands', islandId, 'membership'] });
    },
  });
}
