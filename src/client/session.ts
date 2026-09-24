'use client';

import type { SessionInfo } from '@/shared/protocol';

/** Makes sure this browser has an identity (guest cookie unless signed in) and returns it. */
export async function ensureSession(): Promise<SessionInfo> {
  const res = await fetch('/api/session/guest', { method: 'POST', credentials: 'same-origin' });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not start a session');
  return (await res.json()) as SessionInfo;
}

export async function fetchSession(): Promise<SessionInfo> {
  const res = await fetch('/api/session', { credentials: 'same-origin' });
  return (await res.json()) as SessionInfo;
}
