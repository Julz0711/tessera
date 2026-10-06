'use client';

import { Eye } from 'lucide-react';
import { memo, useEffect, useMemo, useRef } from 'react';
import { describe, type Part } from '@/client/describe';
import { useBoardFlash } from '@/client/ui';
import type { GameEvent, PlayerColor } from '@/engine/types';
import type { PlayerView } from '@/engine/view';
import { PLAYER_COLORS } from '@/shared/colors';
import { CardChip } from './cards';
import { FlatDie, FlatEventDie } from './Dice';

interface Who {
  /** Names as the log shows them ("You" for the viewer). */
  names: string[];
  colors: PlayerColor[];
  ck: boolean;
}

/**
 * A log line only changes if the players' names or colours do, so lines are memoized: the log
 * holds up to 250 events and re-rendering every line (and its card icons) on each update stalled
 * the page.
 */
const Line = memo(function Line({ parts, who }: { parts: Part[]; who: Who }) {
  const ck = who.ck;
  // A roll opens each turn's lines, so it gets a rule above it.
  const roll = parts.some((p) => typeof p !== 'string' && 'dice' in p);
  return (
    <p className={`text-[13px] leading-snug text-paper/90 ${roll ? 'border-t border-white/10 pt-1 first:border-t-0 first:pt-0' : ''}`}>
      {parts.map((p, i) => {
        if (typeof p === 'string') return <span key={i}>{p}</span>;
        if ('player' in p) {
          const color = who.colors[p.player];
          if (!color) return null;
          const c = PLAYER_COLORS[color];
          return (
            <span key={i} className="rounded-md px-1 font-bold" style={{ background: c.hex, color: c.ink }}>
              {who.names[p.player]}
            </span>
          );
        }
        if ('dice' in p)
          return (
            <span key={i} className="mx-0.5 inline-flex translate-y-[-1px] gap-0.5">
              <FlatDie value={p.dice.red} bg={ck ? '#d9483b' : undefined} pip={ck ? '#fff7f0' : undefined} />
              <FlatDie value={p.dice.yellow} bg={ck ? '#f2c14e' : undefined} />
              {p.dice.event && <FlatEventDie face={p.dice.event} />}
            </span>
          );
        if ('hexes' in p)
          return (
            <button
              key={i}
              type="button"
              className="ml-1 inline-flex -translate-y-px items-center gap-0.5 rounded-md border border-white/25 px-1 align-middle text-[11px] font-bold text-foam hover:bg-white/10"
              onClick={() => useBoardFlash.getState().flash(p.hexes)}
              title="Light up these tiles on the board"
            >
              <Eye size={11} /> Show
            </button>
          );
        return <CardChip key={i} card={p.card} n={p.n} />;
      })}
    </p>
  );
});

/** Events are immutable and the client keeps their objects across updates, so lines are worked out once. */
const described = new WeakMap<GameEvent, Part[][]>();

function describeOnce(ev: GameEvent, view: PlayerView): Part[][] {
  let parts = described.get(ev);
  if (!parts) {
    parts = describe(ev, view);
    described.set(ev, parts);
  }
  return parts;
}

export function LogPanel({ view, className = '' }: { view: PlayerView; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const names = view.players.map((p, seat) => (seat === view.viewer ? 'You' : p.name));
  const colors = view.players.map((p) => p.color);
  const whoKey = JSON.stringify([names, colors, view.mode]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const who = useMemo<Who>(() => ({ names, colors, ck: view.mode === 'ck' }), [whoKey]);
  const lines = useMemo(
    () =>
      view.log.flatMap((ev) =>
        describeOnce(ev, view).map((parts, i) => ({ key: `${ev.seq}-${i}`, parts, turn: ev.type === 'turnStarted' ? ev.seat : null })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.log],
  );
  const turnMarks = useMemo(() => view.log.filter((ev) => ev.type === 'turnStarted'), [view.log]);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length]);
  return (
    <div ref={ref} className={`scroll-thin space-y-1 overflow-y-auto pr-1 ${className}`}>
      {lines.map((l) => (
        <Line key={l.key} parts={l.parts} who={who} />
      ))}
      {turnMarks.length === 0 && lines.length === 0 && <p className="text-sm text-foam/40">The story of this game will appear here.</p>}
    </div>
  );
}
