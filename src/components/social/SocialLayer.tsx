'use client';

import { DoorOpen, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchSession } from '@/client/session';
import { startConnection, useGame } from '@/client/store';

const INVITE_TTL_MS = 90_000;

/**
 * Keeps signed-in players connected on every page, so friends see them online and room invites
 * reach them anywhere; shows those invites with a Join button.
 */
export function SocialLayer() {
  const invites = useGame((s) => s.invites);
  const here = useGame((s) => s.room?.code ?? null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetchSession()
      .then((s) => {
        if (s.kind === 'user' && s.persistence) void startConnection().catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!invites.length) return;
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [invites.length]);

  const dismiss = (roomCode: string) => useGame.setState((s) => ({ invites: s.invites.filter((i) => i.roomCode !== roomCode) }));
  const live = invites.filter((i) => now - i.at < INVITE_TTL_MS && i.roomCode !== here);
  if (!live.length) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[70] grid w-[min(320px,calc(100vw-32px))] gap-2">
      {live.map((inv) => (
        <div key={inv.roomCode} className="paper animate-pop flex items-center gap-3 p-3" role="alert">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold leading-tight">{inv.from} invites you to play</p>
            <p className="text-xs text-ink-faint">Room {inv.roomCode.slice(0, 4)}-{inv.roomCode.slice(4)}</p>
          </div>
          <Link href={`/r/${inv.roomCode}`} className="btn btn-primary h-9 px-3 text-sm" onClick={() => dismiss(inv.roomCode)}>
            <DoorOpen size={15} /> Join
          </Link>
          <button type="button" className="btn btn-ghost h-9 w-9 p-0" onClick={() => dismiss(inv.roomCode)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
