'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { fetchFriends } from '@/client/social';
import { useUrlFilters } from '@/client/urlFilters';
import { MAPS } from '@/engine/maps';
import type { FriendInfo, GameSummary, HistoryData } from '@/shared/protocol';
import { MODE_LABEL, ratingPoolFor, isRatingPool } from '@/shared/ratings';

const DEFAULTS = { mode: 'all', map: 'all', result: 'all', rating: 'all', from: '', to: '', friend: '' };
function GameRow({ game: g }: { game: GameSummary }) {
  const duration = g.endedAt ? Math.max(0, Math.round((Date.parse(g.endedAt) - Date.parse(g.startedAt)) / 60000)) : null;
  return <details className="paper-flat group p-4">
    <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-2 marker:hidden">
      <div className="min-w-0"><p className="font-extrabold"><span className={g.won ? 'text-moss' : ''}>{g.won ? 'Victory' : g.rank ? `Finished #${g.rank}` : 'Played'}</span><span className="ml-2 text-xs font-semibold text-ink-soft">{MODE_LABEL[ratingPoolFor(g.mode, g.map)]}</span></p>
        <p className="mt-1 text-xs text-ink-faint">{new Date(g.endedAt ?? g.startedAt).toLocaleDateString()} · {MAPS[g.map as keyof typeof MAPS]?.name ?? g.map ?? 'Standard'}{duration !== null ? ` · ${duration} min` : ''}</p>
      </div>
      <div className="text-right"><p className="font-black tabular">{g.finalVp ?? '—'} VP</p><p className={`text-xs font-bold ${g.ratingDelta !== null && g.ratingDelta > 0 ? 'text-moss' : 'text-ink-soft'}`}>{g.ratingDelta === null ? 'Unrated' : `${g.ratingDelta > 0 ? '+' : ''}${g.ratingDelta} ${g.ratingPool ? 'Elo' : 'legacy'}`}</p></div>
      <span className="col-span-2 text-[11px] font-semibold text-ink-faint group-open:hidden">Show players and details ↓</span>
    </summary>
    <div className="mt-4 grid gap-3 border-t border-ink/10 pt-3">
      <ul className="grid gap-1 text-sm">{g.players.map((p, i) => <li key={i} className="flex justify-between gap-3"><span>{p.name}{p.isYou ? ' (you)' : p.isBot ? ' (bot)' : ''}{p.won ? ' · Winner' : ''}</span><b>{p.vp ?? '—'} VP</b></li>)}</ul>
      <p className="text-xs text-ink-faint">{g.turns ?? '—'} turns{g.ratingBefore !== null && g.ratingBefore !== undefined ? ` · ${g.ratingBefore} → ${g.ratingAfter} ${MODE_LABEL[isRatingPool(g.ratingPool) ? g.ratingPool : ratingPoolFor(g.mode, g.map)]} Elo` : ''}</p>
      {g.hasReport ? <Link className="btn justify-self-start px-3 py-2 text-sm" href={`/games/${g.gameId}`}>Explore stats</Link> : <p className="text-xs text-ink-faint">Detailed stats were not recorded or are no longer available for this game.</p>}
    </div>
  </details>;
}

export function GameHistory() {
  const { params, get, change } = useUrlFilters(DEFAULTS);
  const [data, setData] = useState<HistoryData | null>(null);
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const active = useRef<AbortController | null>(null);
  const query = new URLSearchParams(Object.keys(DEFAULTS).map((key) => [key, get(key)])).toString();
  useEffect(() => { void fetchFriends().then((d) => setFriends(d?.friends ?? [])).catch(() => undefined); }, []);
  async function load(queryString: string, cursor?: string) {
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setLoading(true); setError(null);
    try {
      const url = new URLSearchParams(queryString); if (cursor) url.set('cursor', cursor);
      const response = await fetch(`/api/history?${url}`, { signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not load history.');
      if (!controller.signal.aborted) setData((old) => cursor && old ? { ...body, games: [...old.games, ...body.games] } : body);
    } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  const ready = params !== null;
  useEffect(() => {
    if (!ready) return;
    setData(null); void load(query);
    return () => active.current?.abort();
  }, [query, ready, attempt]);
  const filters = [
    ['mode', 'Mode', [['all', 'All modes'], ...Object.entries(MODE_LABEL)]],
    ['map', 'Map', [['all', 'All maps'], ...Object.values(MAPS).map((m) => [m.id, m.name])]],
    ['result', 'Result', [['all', 'All results'], ['win', 'Wins'], ['other', 'Other results']]],
    ['rating', 'Rating', [['all', 'All games'], ['rated', 'Rated'], ['unrated', 'Unrated']]],
    ['friend', 'Played with', [['', 'Anyone'], ...friends.map((f) => [f.code, f.name])]],
  ] as const;
  return <section className="grid gap-4">
    <div><h1 className="display text-3xl font-black text-paper">Game history</h1><p className="mt-1 text-sm text-foam/70">Find a match, then open its report.</p></div>
    <div className="paper grid gap-4 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{filters.map(([key, label, options]) => <label key={key} className="grid gap-1 text-xs font-bold">{label}<select className="w-full min-w-0 rounded-lg border border-ink/20 bg-paper p-2 text-sm" value={get(key)} onChange={(e) => change({ [key]: e.target.value })}>{options.map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select></label>)}
        {(['from', 'to'] as const).map((key) => <label key={key} className="grid gap-1 text-xs font-bold">{key === 'from' ? 'From (UTC)' : 'Through (UTC)'}<input type="date" className="min-w-0 rounded-lg border border-ink/20 bg-paper p-2 text-sm" value={get(key)} onChange={(e) => change({ [key]: e.target.value })} /></label>)}
      </div>
      <button type="button" className="justify-self-start text-xs font-bold underline" onClick={() => change(Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, null])))}>Clear filters</button>
      {data && <p className="border-t border-ink/10 pt-3 text-sm text-ink-soft">Matching games: <b>{data.summary.games}</b> · Wins: <b>{data.summary.wins}</b> · Avg. place: <b>{data.summary.averagePlace?.toFixed(1) ?? '—'}</b> · Avg. VP: <b>{data.summary.averageVp?.toFixed(1) ?? '—'}</b></p>}
    </div>
    {error && <div role="alert" className="paper p-4"><p>{error}</p><button className="btn mt-2 px-3 py-2" onClick={() => data?.nextCursor ? void load(query, data.nextCursor) : setAttempt((n) => n + 1)}>Try again</button></div>}
    {loading && <p role="status" className="text-sm text-paper">Loading games…</p>}
    {data?.games.map((game) => <GameRow key={game.gameId} game={game} />)}
    {data && !data.games.length && <p className="text-foam/70">No finished games match these filters. Clear the filters to see all your games.</p>}
    {data?.nextCursor && <button type="button" disabled={loading} className="btn btn-dark justify-self-center px-5 py-2" onClick={() => void load(query, data.nextCursor!)}>Load more games</button>}
  </section>;
}
