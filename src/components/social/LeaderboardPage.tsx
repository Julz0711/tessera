'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logomark } from '@/components/ui/Logomark';
import { Segmented } from '@/components/ui/Segmented';
import { useEffect, useState } from 'react';
import { useUrlFilters } from '@/client/urlFilters';
import type { LeaderboardData, LeaderboardEntry } from '@/shared/protocol';
import { MODE_LABEL } from '@/shared/ratings';
import { PlayerPortrait } from '@/components/profile/Cosmetics';
import { HexSpinner } from '@/components/ui/HexSpinner';

const DEFAULTS = { mode: 'classic', scope: 'world', page: '1', q: '', around: '' };
function Row({ entry: e }: { entry: LeaderboardEntry }) {
  return <li className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-xl p-3 ${e.isYou ? 'bg-amber/20 ring-1 ring-amber' : 'odd:bg-paper-2/70'}`}>
    <span className="font-black tabular text-ink-soft">#{e.place}</span>
    <div className="flex min-w-0 items-center gap-2"><div className="shrink-0"><PlayerPortrait knight={e.knight} color={e.color} avatarUrl={e.avatarUrl} frame={e.cosmetics.frame} size={36} /></div><div className="min-w-0">
      <p className="truncate text-sm font-bold">{e.isFriend || e.isYou ? <Link className="hover:underline" href={e.isYou ? '/profile' : `/profile/${e.code}`}>{e.name}</Link> : e.name}{e.isYou ? ' (you)' : e.isFriend ? ' · Friend' : ''}</p>
      <p className="text-xs text-ink-faint">{e.ratedGames} games · {e.gamesWon} wins · {Math.round(e.gamesWon / e.ratedGames * 100)}%</p>
    </div></div>
    <div className="text-right"><p className="display text-2xl font-black">{e.rating}</p><p className="text-[10px] font-bold text-ink-faint">{e.ratedGames < 10 ? 'Provisional' : 'Elo'}</p></div>
  </li>;
}
export function LeaderboardPage() {
  const { params, get, change } = useUrlFilters(DEFAULTS);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const query = new URLSearchParams(Object.keys(DEFAULTS).map((key) => [key, get(key)])).toString();
  const ready = params !== null;
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController(); setData(null); setError(false);
    const timer = setTimeout(() => {
      void fetch(`/api/leaderboard?${query}`, { signal: controller.signal }).then(async (res) => {
        if (!res.ok) throw new Error(); const body = await res.json(); if (!controller.signal.aborted) setData(body);
      }).catch(() => { if (!controller.signal.aborted) setError(true); });
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, ready, attempt]);
  return <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-8">
    <div className="mx-auto grid max-w-3xl gap-5"><div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Home
          </Link>
          <Logomark size={28} />
        </div>
      <section className="paper grid gap-5 p-5 sm:p-7">
        <div><h1 className="display text-4xl font-black">Leaderboards</h1><p className="mt-2 text-sm text-ink-soft">Four modes. Four ladders. Compete with friends or everyone on this server.</p></div>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          <div className="grid gap-1.5"><span className="label">Mode</span><Segmented label="Mode" className="flex-wrap" value={get('mode')} options={Object.entries(MODE_LABEL).map(([key, label]) => ({ value: key, label }))} onChange={(v) => change({ mode: v, page: '1', around: '' })} /></div>
          <div className="grid gap-1.5"><span className="label">Compare with</span><Segmented label="Compare with" value={get('scope')} options={[{ value: 'world', label: 'World' }, { value: 'friends', label: 'Friends' }]} onChange={(v) => change({ scope: v, page: '1', around: '' })} /></div>
        </div>
        <div className="flex flex-wrap gap-2"><input aria-label="Search players by name or friend code" placeholder="Search name or friend code" className="min-w-0 flex-1 input text-sm" value={get('q')} onChange={(e) => change({ q: e.target.value, page: '1', around: '' })} /><button className="btn px-3 py-2 text-sm" onClick={() => change({ around: 'me', q: '', page: '1' })}>Around me</button></div>
        <p className="text-xs text-ink-faint">At least two signed-in players are needed for a rated game. Bots and guests are excluded from Elo comparisons. Maps share their mode’s ladder. Equal ratings share a rank.</p>
        {error && <div role="alert">Couldn&apos;t load the leaderboard. <button className="font-bold underline" onClick={() => setAttempt((n) => n + 1)}>Try again</button></div>}
        {!data && !error && <div role="status" className="flex items-center gap-2 text-sm text-ink-faint"><HexSpinner size={16} decorative /> Loading rankings…</div>}
        {data && !data.enabled && <p>Ratings are unavailable without a database.</p>}
        {data?.signInRequired && <p><Link className="font-bold underline" href="/profile">Sign in</Link> to compare with your friends.</p>}
        {data?.enabled && !data.signInRequired && <>
          <p className="label">{data.scope === 'friends' ? 'Rank among friends + you' : 'World rank'} · {data.total} matching players</p>
          {!data.entries.length && <p className="text-sm text-ink-soft">No rated players match this selection yet.</p>}
          <ol className="grid gap-1">{data.entries.map((entry) => <Row key={entry.code} entry={entry} />)}</ol>
          {(data.pages ?? 1) > 1 && <div className="flex items-center justify-between gap-2 text-sm"><button className="btn px-3 py-2" disabled={data.page === 1} onClick={() => change({ page: String((data.page ?? 1) - 1), around: '' })}>Previous</button><span>{data.page} / {data.pages}</span><button className="btn px-3 py-2" disabled={data.page === data.pages} onClick={() => change({ page: String((data.page ?? 1) + 1), around: '' })}>Next</button></div>}
          {data.you && <div className="border-t border-ink/10 pt-4"><p className="label mb-2">Your position</p><ol><Row entry={data.you} /></ol></div>}
          {!data.you && <p className="text-xs text-ink-faint">Play a rated game in this mode to establish your position. New ladders begin at 1000; the first 10 games are provisional.</p>}
        </>}
      </section>
    </div>
  </main>;
}
