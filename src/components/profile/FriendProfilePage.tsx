'use client';

import { ArrowLeft, DoorOpen, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FriendInfo, FriendProfileData } from '@/shared/protocol';
import { PlayerPortrait, TitleTag } from './Cosmetics';
import { MODE_LABEL, ratingPoolFor } from '@/shared/ratings';
import { ModeRatings } from './ModeRatings';
import { Logomark } from '@/components/ui/Logomark';

const STATUS: Record<FriendInfo['status'], string> = {
  offline: 'Offline', online: 'Online', lobby: 'In a lobby', playing: 'Playing',
};

export function FriendProfilePage({ code }: { code: string }) {
  const [data, setData] = useState<FriendProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/friends/${encodeURIComponent(code)}`, { credentials: 'same-origin', signal: controller.signal });
        if (!response.ok) {
          throw new Error(response.status === 401 ? 'Sign in to view friend profiles.' : response.status === 404
            ? 'This profile is unavailable. You can only view accepted friends.'
            : 'Could not load this profile. Please try again.');
        }
        const profile = await response.json() as FriendProfileData;
        if (!controller.signal.aborted) setData(profile);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load this profile.');
      }
    }
    void load();
    return () => controller.abort();
  }, [code, attempt]);

  const friend = data?.friend;
  const stats = data?.stats;
  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-2xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/profile?tab=friends" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Back to my profile
          </Link>
          <Logomark size={28} />
        </div>
        {error && (
          <section className="paper grid gap-3 p-5" role="alert">
            <h1 className="display text-2xl font-black">Profile unavailable</h1>
            <p className="text-sm text-ink-soft">{error}</p>
            <button type="button" className="btn justify-self-start px-4 py-2" onClick={() => { setError(null); setAttempt((n) => n + 1); }}>Try again</button>
          </section>
        )}
        {!data && !error && <p role="status" className="paper animate-pulse p-7">Loading friend profile…</p>}
        {data && friend && stats && (
          <>
            <section className="paper grid gap-6 p-5 sm:p-7">
              <div className="flex items-center gap-4">
                <PlayerPortrait knight={friend.knight} color={friend.color} avatarUrl={friend.avatarUrl} frame={friend.cosmetics.frame} size={80} />
                <div className="min-w-0">
                  <p className="label mb-1">Friend profile</p>
                  <h1 className="display break-words text-3xl font-black sm:text-4xl">{friend.name}</h1>
                  <TitleTag title={friend.cosmetics.title} />
                  <p className="mt-1 text-sm font-semibold text-ink-soft">{STATUS[friend.status]}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Games played', stats.gamesPlayed], ['Wins', stats.gamesWon],
                  ['Win rate', stats.gamesPlayed ? `${Math.round(stats.gamesWon / stats.gamesPlayed * 100)}%` : '—'],
                  ['Shared games', data.headToHead.games],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-paper-2 px-3 py-3">
                    <dt className="label">{label}</dt>
                    <dd className="display mt-1 text-2xl font-black tabular">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm font-semibold text-ink-soft">In your shared games: you won {data.headToHead.yourWins}, {friend.name} won {data.headToHead.theirWins}.</p>
              <ModeRatings ratings={data.ratings} />
              {friend.roomCode && (
                <Link href={`/r/${friend.roomCode}`} className="btn btn-primary justify-self-start px-4 py-2">
                  <DoorOpen size={16} /> {friend.status === 'lobby' ? 'Join lobby' : 'Watch game'}
                </Link>
              )}
            </section>
            <section className="paper p-5 sm:p-7">
              <h2 className="display text-2xl font-black">Recent games</h2>
              <p className="mt-1 mb-4 text-xs font-semibold text-ink-faint">Latest {data.recentGames.length} finished games · Results for {friend.name}</p>
              {!data.recentGames.length ? <p className="text-sm text-ink-soft">No finished games yet.</p> : (
                <ol className="grid gap-2">
                  {data.recentGames.map((game, index) => (
                    <li key={`${game.startedAt}-${index}`} className="flex items-center gap-3 rounded-xl bg-paper-2 p-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-black ${game.won ? 'bg-amber' : 'bg-ink/10'}`}>
                        {game.won ? <Trophy size={17} aria-label="Victory" /> : game.rank === null ? '—' : `#${game.rank}`}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold">{MODE_LABEL[ratingPoolFor(game.mode, game.map)]} <span className="font-semibold text-ink-soft">· {game.finalVp ?? '—'} VP</span></p>
                        <time dateTime={game.endedAt ?? game.startedAt} className="text-xs text-ink-faint">{new Date(game.endedAt ?? game.startedAt).toLocaleDateString()}</time>
                      </div>
                      <span className={`shrink-0 text-sm font-bold tabular ${game.ratingDelta !== null && game.ratingDelta > 0 ? 'text-moss' : 'text-ink-soft'}`}>
                        {game.ratingDelta === null ? 'Unrated' : `${game.ratingDelta > 0 ? '+' : ''}${game.ratingDelta} ${game.ratingPool ? 'Elo' : 'legacy'}`}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
