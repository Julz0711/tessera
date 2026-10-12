'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchFriends } from '@/client/social';
import type { FriendInfo, FriendsData } from '@/shared/protocol';
import { PlayerPortrait } from '@/components/profile/PlayerPortrait';
import { Modal } from '@/components/ui/Modal';

const ORDER: Record<FriendInfo['status'], number> = { lobby: 0, playing: 1, online: 2, offline: 3 };
const STATUS: Record<FriendInfo['status'], { label: string; dot: string }> = {
  lobby: { label: 'In a lobby', dot: 'bg-amber' },
  playing: { label: 'Playing', dot: 'bg-terracotta' },
  online: { label: 'Online', dot: 'bg-moss' },
  offline: { label: 'Offline', dot: 'bg-ink/25' },
};
const SHOWN = 3;

function Row({ f }: { f: FriendInfo }) {
  const s = STATUS[f.status];
  return (
    <li className="flex items-center gap-2">
      <PlayerPortrait color={f.color} avatarUrl={f.avatarUrl} size={32} />
      <Link href={`/profile/${f.code}`} className="min-w-0 flex-1 truncate text-sm font-bold hover:underline">{f.name}</Link>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink ${s.dot}`} aria-hidden />
      <span className="w-20 shrink-0 truncate text-xs font-bold text-ink-soft">{s.label}</span>
      {f.roomCode && f.status === 'lobby' && <Link href={`/r/${f.roomCode}`} className="btn btn-dark px-2.5 py-1 text-xs">Join</Link>}
    </li>
  );
}

/** Your friends on the main menu: three of them, online first, and a centred list with everyone. Signed-in players only. */
export function FriendsCard() {
  const [data, setData] = useState<FriendsData | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    const load = () => fetchFriends().then(setData).catch(() => undefined);
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);
  if (!data?.enabled) return null;
  const friends = [...data.friends].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const online = friends.filter((f) => f.status !== 'offline').length;
  return (
    <div className="paper-flat w-72 p-3">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-label text-ink-soft">Friends{friends.length ? ` · ${online} online` : ''}</h2>
      {friends.length === 0 ? (
        <p className="text-sm font-bold text-ink-soft">Add friends from your profile to see when they&apos;re online.</p>
      ) : (
        <ul className="grid gap-2">{friends.slice(0, SHOWN).map((f) => <Row key={f.code} f={f} />)}</ul>
      )}
      {friends.length > SHOWN ? (
        <button type="button" className="btn mt-3 w-full px-3 py-1.5 text-sm" onClick={() => setAll(true)}>See all {friends.length} friends</button>
      ) : (
        <Link href="/profile?tab=friends" className="mt-3 block text-center text-xs font-bold text-ink-soft hover:text-ink">Manage friends</Link>
      )}
      <Modal open={all} onClose={() => setAll(false)} title={`Friends · ${friends.length}`}>
        <ul className="grid gap-2.5">{friends.map((f) => <Row key={f.code} f={f} />)}</ul>
        <Link href="/profile?tab=friends" className="btn mt-4 w-full px-3 py-2 text-sm">Manage friends</Link>
      </Modal>
    </div>
  );
}
