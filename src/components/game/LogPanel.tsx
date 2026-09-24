'use client';

import { useEffect, useMemo, useRef } from 'react';
import { describe, type Part } from '@/client/describe';
import type { PlayerView } from '@/engine/view';
import { PLAYER_COLORS } from '@/shared/colors';
import { CardChip } from './cards';

function Line({ parts, view }: { parts: Part[]; view: PlayerView }) {
  return (
    <p className="text-[13px] leading-snug text-paper/90">
      {parts.map((p, i) => {
        if (typeof p === 'string') return <span key={i}>{p}</span>;
        if ('player' in p) {
          const pl = view.players[p.player];
          if (!pl) return null;
          const c = PLAYER_COLORS[pl.color];
          return (
            <span key={i} className="rounded px-1 font-extrabold" style={{ background: c.hex, color: c.ink }}>
              {p.player === view.viewer ? 'You' : pl.name}
            </span>
          );
        }
        return <CardChip key={i} card={p.card} n={p.n} />;
      })}
    </p>
  );
}

export function LogPanel({ view, className = '' }: { view: PlayerView; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const lines = useMemo(
    () =>
      view.log.flatMap((ev) =>
        describe(ev, view).map((parts, i) => ({ key: `${ev.seq}-${i}`, parts, turn: ev.type === 'turnStarted' ? ev.seat : null })),
      ),
    [view],
  );
  const turnMarks = useMemo(() => view.log.filter((ev) => ev.type === 'turnStarted'), [view.log]);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length]);
  return (
    <div ref={ref} className={`scroll-thin space-y-1 overflow-y-auto pr-1 ${className}`}>
      {lines.map((l) => (
        <Line key={l.key} parts={l.parts} view={view} />
      ))}
      {turnMarks.length === 0 && lines.length === 0 && <p className="text-sm text-foam/40">The story of this game will appear here.</p>}
    </div>
  );
}
