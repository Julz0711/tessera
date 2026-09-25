'use client';

import type { FriendsData, LeaderboardData } from '@/shared/protocol';

export type FriendAction = 'request' | 'accept' | 'remove' | 'invite';

export async function fetchFriends(): Promise<FriendsData | null> {
  const res = await fetch('/api/friends', { credentials: 'same-origin' });
  return res.ok ? ((await res.json()) as FriendsData) : null;
}

/** Runs a friends action; resolves to the updated friends data, or throws with the server's message. */
export async function friendAction(action: FriendAction, code: string): Promise<FriendsData> {
  const res = await fetch('/api/friends', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, code }),
  });
  const body = (await res.json().catch(() => ({}))) as FriendsData & { error?: string };
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong');
  return body;
}

export async function fetchLeaderboard(): Promise<LeaderboardData | null> {
  const res = await fetch('/api/leaderboard', { credentials: 'same-origin' });
  return res.ok ? ((await res.json()) as LeaderboardData) : null;
}

export function formatFriendCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
