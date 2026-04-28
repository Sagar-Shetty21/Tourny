import useSWR, { mutate as globalMutate } from "swr";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = async (url: string): Promise<any> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    const data = await res.json().catch(() => ({}));
    (error as any).status = res.status;
    (error as any).info = data;
    throw error;
  }
  return res.json();
};

// ── SWR cache key helpers ──

export const swrKeys = {
  tournaments: "/api/tournaments",
  tournament: (id: string) => `/api/tournaments/${id}`,
  tournamentPublic: (id: string) => `/api/tournaments/${id}/public`,
  activityLogs: (id: string, limit = 20) =>
    `/api/tournaments/${id}/activity?limit=${limit}`,
  inviteToken: (token: string) => `/api/invites/${token}`,
  matches: (id: string) => `/api/tournaments/${id}/matches`,
};

// ── Custom hooks ──

export function useTournaments() {
  const { data, error, isLoading, mutate } = useSWR<{
    tournaments: any[];
    total: number;
  }>(swrKeys.tournaments, fetcher);
  return {
    tournaments: data?.tournaments ?? [],
    total: data?.total ?? 0,
    error,
    isLoading,
    mutate,
  };
}

export function useTournament(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    tournament: any;
    role: string | null;
  }>(id ? swrKeys.tournament(id) : null, fetcher, {
    refreshInterval: 30000,
  });
  return {
    tournament: data?.tournament ?? null,
    role: data?.role ?? null,
    error,
    isLoading,
    mutate,
  };
}

export function useTournamentMatches(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    matches: any[];
    total: number;
  }>(id ? swrKeys.matches(id) : null, fetcher, {
    refreshInterval: 30000,
  });
  return {
    matches: data?.matches ?? [],
    total: data?.total ?? 0,
    error,
    isLoading,
    mutate,
  };
}

export function useTournamentPublic(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    tournament: any;
    matches: any[];
    participants: any[];
  }>(id ? swrKeys.tournamentPublic(id) : null, fetcher, {
    refreshInterval: 30000,
  });
  return {
    tournament: data?.tournament ?? null,
    matches: data?.matches ?? [],
    participants: data?.participants ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useActivityLogs(
  id: string | undefined,
  enabled: boolean = true
) {
  const { data, error, isLoading, mutate } = useSWR<{
    logs: any[];
  }>(id && enabled ? swrKeys.activityLogs(id) : null, fetcher);
  return {
    logs: data?.logs ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useInviteToken(token: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    tournament: any;
  }>(token ? swrKeys.inviteToken(token) : null, fetcher);
  return {
    tournament: data?.tournament ?? null,
    error,
    isLoading,
    mutate,
  };
}

// ── Mutation helpers ──

export function invalidateTournaments() {
  return globalMutate(swrKeys.tournaments);
}

export function invalidateTournament(id: string) {
  return globalMutate(swrKeys.tournament(id));
}

export function invalidateMatches(id: string) {
  return globalMutate(swrKeys.matches(id));
}

export { fetcher };
