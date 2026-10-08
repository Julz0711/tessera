'use client';

import { Check, Copy, DoorOpen, Mail, UserMinus, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { fetchFriends, formatFriendCode, friendAction, type FriendAction } from '@/client/social';
import { toast } from '@/client/store';
import type { FriendInfo, FriendsData, PlayerCard } from '@/shared/protocol';
import { PlayerPortrait, TitleTag } from '@/components/profile/Cosmetics';
import { HexSpinner } from '@/components/ui/HexSpinner';

const STATUS: Record<FriendInfo['status'], { label: string; dot: string }> = {
  lobby: { label: 'In a lobby', dot: 'bg-amber' },
  playing: { label: 'Playing', dot: 'bg-terracotta' },
  online: { label: 'Online', dot: 'bg-moss' },
  offline: { label: 'Offline', dot: 'bg-ink/25' },
};

function Person({ card, sub, children, profile = false }: { card: PlayerCard; sub?: React.ReactNode; children?: React.ReactNode; profile?: boolean }) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl border-2 border-ink bg-paper-2/70 p-1.5 pr-2">
      <PlayerPortrait knight={card.knight} color={card.color} avatarUrl={card.avatarUrl} frame={card.cosmetics.frame} size={40} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-bold leading-tight">
          {profile ? (
            <Link href={`/profile/${card.code}`} className="truncate underline decoration-ink/25 underline-offset-2 hover:decoration-ink focus-visible:outline-2" aria-label={`View ${card.name}'s profile`}>
              {card.name}
            </Link>
          ) : <span className="truncate">{card.name}</span>}
          <TitleTag title={card.cosmetics.title} className="shrink-0" />
        </p>
        <p className="truncate text-xs font-semibold text-ink-faint">{sub ?? (profile ? 'View profile and mode ratings' : 'Player')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </li>
  );
}

function IconButton({ label, onClick, children, tone = '' }: { label: string; onClick: () => void; children: React.ReactNode; tone?: string }) {
  return (
    <button type="button" className={`btn h-8 w-8 p-0 ${tone}`} onClick={onClick} title={label} aria-label={label}>
      {children}
    </button>
  );
}

/**
 * Friends: your friend code, adding by code, requests, your friends with what they're up to, and
 * players from recent games. In `invite` mode (the lobby) it's just online friends with an Invite button.
 */
export function FriendsPanel({ mode = 'full', roomCode }: { mode?: 'full' | 'invite'; roomCode?: string }) {
  const [data, setData] = useState<FriendsData | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchFriends().then(setData).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    // Friends' status changes as they come and go.
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (action: FriendAction, target: string, done?: string) => {
    setBusy(true);
    try {
      setData(await friendAction(action, target));
      if (done) toast(done, 'good');
      if (action === 'request') setCode('');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="h-24 animate-pulse rounded-xl bg-paper-2" />;
  if (!data.enabled) {
    return <p className="text-sm text-ink-soft">Sign in to add friends, see when they&apos;re online and invite them to your games.</p>;
  }

  if (mode === 'invite') {
    const available = data.friends.filter((f) => f.status !== 'offline' && f.roomCode !== roomCode);
    const here = data.friends.filter((f) => f.roomCode === roomCode);
    if (!data.friends.length) return <p className="text-sm text-ink-soft">No friends yet. Add some on your profile.</p>;
    return (
      <ul className="grid gap-1.5">
        {available.map((f) => (
          <Person key={f.code} card={f} profile sub={STATUS[f.status].label}>
            <button type="button" className="btn btn-primary h-8 px-2.5 text-xs" disabled={busy} onClick={() => run('invite', f.code, `Invite sent to ${f.name}`)}>
              <Mail size={14} /> Invite
            </button>
          </Person>
        ))}
        {here.map((f) => (
          <Person key={f.code} card={f} profile sub="In this room" />
        ))}
        {!available.length && !here.length && <p className="text-sm text-ink-soft">None of your friends are online right now.</p>}
      </ul>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.myCode ?? '');
      toast('Friend code copied', 'good');
    } catch {
      toast(formatFriendCode(data.myCode ?? ''));
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <span className="label">Your friend code</span>
          <button type="button" onClick={copy} className="mt-0.5 flex items-center gap-2 text-xl font-black tabular tracking-label" title="Copy">
            {formatFriendCode(data.myCode ?? '')} <Copy size={16} className="text-ink-faint" />
          </button>
        </div>
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) void run('request', code, 'Friend request sent');
          }}
        >
          <input className="input w-40 py-2 uppercase tabular tracking-label" placeholder="ABCD-2345" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Friend code" maxLength={9} />
          <button type="submit" className="btn btn-primary px-3" disabled={busy || !code.trim()}>
            {busy ? <HexSpinner size={16} decorative /> : <UserPlus size={16} />} Add
          </button>
        </form>
      </div>

      {data.incoming.length > 0 && (
        <div className="grid gap-1.5">
          <span className="label">Friend requests</span>
          <ul className="grid gap-1.5">
            {data.incoming.map((c) => (
              <Person key={c.code} card={c}>
                <IconButton label="Accept" tone="btn-primary" onClick={() => run('accept', c.code, `You and ${c.name} are now friends`)}>
                  <Check size={15} />
                </IconButton>
                <IconButton label="Decline" tone="btn-danger" onClick={() => run('remove', c.code)}>
                  <X size={15} />
                </IconButton>
              </Person>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-1.5">
        <span className="label">Friends ({data.friends.length})</span>
        {data.friends.length === 0 ? (
          <p className="text-sm text-ink-soft">Share your code, or add people you played with below.</p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {data.friends.map((f) => (
              <Person
                key={f.code}
                card={f}
                profile
                sub={
                  <span className="flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full ${STATUS[f.status].dot}`} /> {STATUS[f.status].label}
                  </span>
                }
              >
                {f.roomCode && (
                  <Link href={`/r/${f.roomCode}`} className="btn h-8 px-2 text-xs" title={f.status === 'lobby' ? 'Join their lobby' : 'Watch their game'}>
                    <DoorOpen size={14} /> {f.status === 'lobby' ? 'Join' : 'Watch'}
                  </Link>
                )}
                <IconButton
                  label="Remove friend"
                  onClick={() => {
                    if (confirm(`Remove ${f.name} from your friends?`)) void run('remove', f.code);
                  }}
                >
                  <UserMinus size={14} />
                </IconButton>
              </Person>
            ))}
          </ul>
        )}
      </div>

      {data.outgoing.length > 0 && (
        <div className="grid gap-1.5">
          <span className="label">Waiting for an answer</span>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {data.outgoing.map((c) => (
              <Person key={c.code} card={c} sub="Request sent">
                <IconButton label="Cancel request" onClick={() => run('remove', c.code)}>
                  <X size={15} />
                </IconButton>
              </Person>
            ))}
          </ul>
        </div>
      )}

      {data.recent.length > 0 && (
        <div className="grid gap-1.5">
          <span className="label">Played with recently</span>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {data.recent.map((c) => (
              <Person key={c.code} card={c}>
                <IconButton label={`Add ${c.name}`} tone="btn-primary" onClick={() => run('request', c.code, 'Friend request sent')}>
                  <UserPlus size={14} />
                </IconButton>
              </Person>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
