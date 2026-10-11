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
  return (
    <p className="text-[13px] leading-snug text-paper/90">
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

/** Each turn opens with a rule naming whose turn it is, in their colour. */
const TurnRule = memo(function TurnRule({ seat, who }: { seat: number; who: Who }) {
  const color = who.colors[seat];
  const c = color ? PLAYER_COLORS[color] : null;
  const name = who.names[seat];
  return (
    <div className="flex items-center gap-2 pb-1 pt-3 first:pt-0" role="separator" aria-label={`${name === 'You' ? 'Your' : `${name}'s`} turn`}>
      <span className="h-px flex-1 bg-white/15" />
      <span className="rounded-md px-1.5 text-[11px] font-black uppercase tracking-caps" style={c ? { background: c.hex, color: c.ink } : undefined}>
        {name === 'You' ? 'Your turn' : `${name}'s turn`}
      </span>
      <span className="h-px flex-1 bg-white/15" />
    </div>
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
        ev.type === 'turnStarted'
          ? [{ key: `${ev.seq}-turn`, parts: [] as Part[], turn: ev.seat as number | null }]
          : describeOnce(ev, view).map((parts, i) => ({ key: `${ev.seq}-${i}`, parts, turn: null as number | null })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.log],
  );
  const turnMarks = useMemo(() => view.log.filter((ev) => ev.type === 'turnStarted'), [view.log]);
  // Follows the newest line unless the reader has scrolled up to read back. Keyed on the last line,
  // not the count: past LOG_LIMIT the log drops its oldest events, so the count stops changing. A
  // jump, not a smooth scroll: smooth ones stop short when several events land at once.
  const stuck = useRef(true);
  const last = lines.at(-1)?.key;
  useEffect(() => {
    const el = ref.current;
    if (el && stuck.current) el.scrollTop = el.scrollHeight;
  }, [last]);
  // The panel also grows and shrinks (a tab coming back, the layout changing): stay at the bottom.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (stuck.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const onScroll = () => {
    const el = ref.current;
    if (el) stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };
  return (
    <div ref={ref} onScroll={onScroll} className={`scroll-thin space-y-1 overflow-y-auto pr-1 ${className}`}>
      {lines.map((l) => (l.turn !== null ? <TurnRule key={l.key} seat={l.turn} who={who} /> : <Line key={l.key} parts={l.parts} who={who} />))}
      {turnMarks.length === 0 && lines.length === 0 && <p className="text-sm text-foam/40">The story of this game will appear here.</p>}
    </div>
  );
}
