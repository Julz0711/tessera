'use client';

import { ArrowLeft, Medal, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '@/client/social';
import type { LeaderboardData, LeaderboardEntry } from '@/shared/protocol';
import { PlayerPortrait, TitleTag } from '@/components/profile/Cosmetics';
import { Logomark } from '@/components/ui/Logomark';

const MEDAL = ['#f2c14e', '#c9ced6', '#c98a55'];

function Row({ e }: { e: LeaderboardEntry }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl px-3 py-2 ${e.isYou ? 'bg-amber/30 ring-2 ring-amber' : 'odd:bg-paper-2/60'}`}>
      <span className="grid w-8 shrink-0 place-items-center">
        {e.place <= 3 ? <Medal size={22} style={{ color: MEDAL[e.place - 1] }} fill={MEDAL[e.place - 1]} strokeWidth={1.5} /> : <span className="display text-lg font-black tabular text-ink-soft">{e.place}</span>}
      </span>
      <PlayerPortrait knight={e.knight} color={e.color} avatarUrl={e.avatarUrl} frame={e.cosmetics.frame} size={42} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 font-extrabold">
        <span className="truncate">{e.name}</span>
        {e.isYou && <span className="text-xs font-bold text-ink-faint">(you)</span>}
        <TitleTag title={e.cosmetics.title} className="hidden shrink-0 sm:inline-flex" />
      </span>
      <span className="hidden w-20 text-right text-sm font-semibold text-ink-soft sm:block">{e.ratedGames} {e.ratedGames === 1 ? 'game' : 'games'}</span>
      <span className="hidden w-16 text-right text-sm font-semibold text-ink-soft sm:block">{e.gamesWon} {e.gamesWon === 1 ? 'win' : 'wins'}</span>
      <span className="display w-16 text-right text-2xl font-black tabular">{e.rating}</span>
    </li>
  );
}

export function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchLeaderboard()
      .then((d) => (d ? setData(d) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-2xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Home
          </Link>
          <Logomark size={28} />
        </div>
        <section className="paper animate-rise p-5 sm:p-7">
          <h1 className="display flex items-center gap-2 text-4xl font-black">
            <Trophy size={30} className="text-amber-deep" /> Leaderboard
          </h1>
          <p className="mb-5 mt-1 text-sm text-ink-soft">
            Ratings come from games with at least two signed-in players. Beat stronger players to climb faster; bots and guests don&apos;t count.
          </p>
          {failed && <p>Couldn&apos;t load the leaderboard.</p>}
          {!data && !failed && <div className="h-64 animate-pulse rounded-xl bg-paper-2" />}
          {data && !data.enabled && <p className="text-ink-soft">This server runs without a database, so there are no ratings.</p>}
          {data?.enabled && data.entries.length === 0 && <p className="text-ink-soft">No rated games yet. Play a game with a signed-in friend to get on the board.</p>}
          {data?.enabled && data.entries.length > 0 && (
            <ol className="grid gap-1">
              {data.entries.map((e) => (
                <Row key={e.code} e={e} />
              ))}
              {data.you && (
                <>
                  <li className="py-1 text-center text-ink-faint">⋯</li>
                  <Row e={data.you} />
                </>
              )}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
