'use client';

import { ChevronDown, ChevronUp, Crown, Swords, Trophy } from 'lucide-react';
import { useState } from 'react';
import type { Mode } from '@/engine/types';
import type { GameSummary } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';

/** Games shown before "Show all". */
const SHOWN = 3;
/** Results in the "Recent form" strip. */
const FORM = 10;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const yourVp = (g: GameSummary) => g.finalVp ?? g.players.find((p) => p.isYou)?.vp ?? null;
const modeName = (m: Mode) => (m === 'ck' ? 'C&K' : 'Classic');

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="grid content-start gap-0.5 rounded-xl bg-paper-2 px-3 py-2.5">
      <span className="label">{label}</span>
      <span className="display text-2xl font-black tabular">{value}</span>
      {sub && <span className="text-xs font-semibold text-ink-faint">{sub}</span>}
    </div>
  );
}

/** Averages, recent form and a per-mode split over the games the server returned (newest first). */
function Summary({ history }: { history: GameSummary[] }) {
  const ranks = history.flatMap((g) => (g.rank !== null ? [g.rank] : []));
  const place = mean(ranks);
  const players = mean(history.map((g) => g.players.length));
  const vp = mean(history.flatMap((g) => {
    const v = yourVp(g);
    return v !== null ? [v] : [];
  }));
  const rated = history.filter((g) => g.ratingDelta !== null);
  const ratingNet = rated.reduce((n, g) => n + (g.ratingDelta ?? 0), 0);
  const modes = (['classic', 'ck'] as const)
    .map((m) => {
      const games = history.filter((g) => g.mode === m);
      return { m, games: games.length, wins: games.filter((g) => g.won).length, place: mean(games.flatMap((g) => (g.rank !== null ? [g.rank] : []))) };
    })
    .filter((x) => x.games > 0);
  const form = history.slice(0, FORM);

  return (
    <div className="paper grid gap-4 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Avg. place" value={place !== null ? place.toFixed(1) : '–'} sub={players !== null ? `of ${players.toFixed(1).replace(/\.0$/, '')} players on average` : undefined} />
        <Tile label="Avg. points" value={vp !== null ? vp.toFixed(1) : '–'} />
        <Tile label="Wins" value={`${history.filter((g) => g.won).length}/${history.length}`} sub={`${Math.round((history.filter((g) => g.won).length / history.length) * 100)}% of the last ${history.length}`} />
        {rated.length > 0 ? (
          <Tile
            label="Rating"
            value={<span className={ratingNet >= 0 ? 'text-moss' : 'text-danger'}>{`${ratingNet >= 0 ? '+' : ''}${ratingNet}`}</span>}
            sub={`over ${rated.length} rated game${rated.length === 1 ? '' : 's'}`}
          />
        ) : (
          <Tile label="Best finish" value={ranks.length ? `#${Math.min(...ranks)}` : '–'} />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <span className="label">Recent form</span>
          <div className="flex gap-1" aria-label="Recent results, newest first">
            {form.map((g) => (
              <span
                key={g.gameId}
                title={`${g.won ? 'Won' : g.rank ? `#${g.rank}` : 'Played'} · ${modeName(g.mode)}`}
                className={`grid h-7 w-7 place-items-center rounded-lg border-2 border-ink text-xs font-black ${g.won ? 'bg-amber' : 'bg-paper-2'}`}
              >
                {g.won ? <Trophy size={13} /> : (g.rank ?? '–')}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-1 text-sm font-bold text-ink-soft">
          {modes.map((x) => (
            <span key={x.m} className="flex items-center gap-1.5">
              {x.m === 'ck' ? <Crown size={14} /> : <Swords size={14} />}
              {modeName(x.m)}: {x.games} game{x.games === 1 ? '' : 's'} · {x.wins} win{x.wins === 1 ? '' : 's'}
              {x.place !== null && <span className="text-ink-faint">· avg. #{x.place.toFixed(1)}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameRow({ g }: { g: GameSummary }) {
  return (
    <article className="paper-flat flex flex-wrap items-center gap-3 p-3">
      <span className={`grid h-10 w-10 place-items-center rounded-xl border-2 border-ink ${g.won ? 'bg-amber' : 'bg-paper-2'}`}>
        {g.won ? <Trophy size={18} /> : <span className="display text-lg font-black">{g.rank ?? '–'}</span>}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-extrabold">
          {g.won ? 'Victory' : g.rank ? `Finished #${g.rank}` : 'Played'}
          <span className="flex items-center gap-1 rounded bg-ink px-1.5 text-[10px] font-black uppercase tracking-wider text-paper">
            {g.mode === 'ck' ? <Crown size={10} /> : <Swords size={10} />} {modeName(g.mode)}
          </span>
        </div>
        <p className="text-xs text-ink-faint">
          {new Date(g.endedAt ?? g.startedAt).toLocaleString()}
          {g.ratingDelta !== null && (
            <span className={`ml-2 font-black ${g.ratingDelta >= 0 ? 'text-moss' : 'text-danger'}`}>
              {g.ratingDelta >= 0 ? '+' : ''}
              {g.ratingDelta} rating
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {g.players.map((p, i) => (
          <span
            key={i}
            className={`rounded-md px-2 py-0.5 text-xs font-bold ${p.isYou ? 'ring-2 ring-ink' : ''}`}
            style={{ background: PLAYER_COLORS[p.color].hex, color: PLAYER_COLORS[p.color].ink }}
          >
            {p.name} · {p.vp ?? '?'}
            {p.won ? ' 🏆' : ''}
          </span>
        ))}
      </div>
    </article>
  );
}

/** The profile's game history: a summary, then the latest few games with the rest behind a button. */
export function GameHistory({ history }: { history: GameSummary[] }) {
  const [all, setAll] = useState(false);
  return (
    <section className="grid gap-3">
      <h2 className="display text-2xl font-black text-paper">Game history</h2>
      {history.length === 0 ? (
        <p className="text-foam/60">No finished games yet. Go win one!</p>
      ) : (
        <>
          <Summary history={history} />
          {(all ? history : history.slice(0, SHOWN)).map((g) => (
            <GameRow key={g.gameId} g={g} />
          ))}
          {history.length > SHOWN && (
            <button type="button" className="btn btn-dark justify-self-center px-4 py-2 text-sm" onClick={() => setAll((a) => !a)}>
              {all ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {all ? 'Show fewer' : `Show all ${history.length} games`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
