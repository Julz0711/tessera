'use client';

import { Dices, Pause, Play, Route, Shield, SkipBack, SkipForward, StepBack, StepForward, Swords, Trophy } from 'lucide-react';
import { useMemo, useRef } from 'react';
import type { Replay, ReplayMarker, ReplayMarkerKind } from '@/engine/replay';
import { PLAYER_COLORS } from '@/shared/colors';
import type { PlayerColor } from '@/engine/types';

export const SPEEDS = [1, 2, 4] as const;

const MARKER: Record<ReplayMarkerKind, { icon: React.ReactNode; tone: string }> = {
  seven: { icon: <Dices size={12} />, tone: '#d9483b' },
  longestRoad: { icon: <Route size={12} />, tone: '#3a74d8' },
  largestArmy: { icon: <Swords size={12} />, tone: '#8b5bc9' },
  barbarian: { icon: <Shield size={12} />, tone: '#8f2a22' },
  win: { icon: <Trophy size={12} />, tone: '#d9a21b' },
  // Chess notation for the analysis' flagged moves (drawn as keys of their own, see below).
  mistake: { icon: '?', tone: 'var(--color-amber)' },
  blunder: { icon: '??', tone: 'var(--color-danger)' },
};

/** The graph's own coordinate space; it is stretched to the bar's width, so it lines up with the scrubber. */
const GRAPH_W = 1000;
const GRAPH_H = 100;
/** Room above the leader's line and below a pointless player's. */
const PAD = 6;

/**
 * The bar under the board: transport keys, a scrubber (turn ticks, event markers) and the points
 * graph. The scrubber and the graph share one horizontal scale, so a click or drag on either one
 * jumps to that moment.
 */
export function Timeline({
  replay,
  colors,
  names,
  step,
  playing,
  speed,
  turnLabel,
  onStep,
  onTurn,
  onPlay,
  onSpeed,
  onSeek,
  moves = [],
}: {
  replay: Replay;
  /** Mistakes and blunders from the move analysis, on a row of their own above the events. */
  moves?: ReplayMarker[];
  colors: PlayerColor[];
  names: string[];
  step: number;
  playing: boolean;
  speed: number;
  turnLabel: string;
  onStep: (delta: number) => void;
  onTurn: (delta: number) => void;
  onPlay: () => void;
  onSpeed: (speed: number) => void;
  onSeek: (step: number) => void;
}) {
  const total = Math.max(1, replay.total);
  const track = useRef<HTMLDivElement>(null);
  const pct = (s: number) => `${(s / total) * 100}%`;

  const seekAt = (clientX: number) => {
    const el = track.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onSeek(Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * total));
  };

  const top = useMemo(() => Math.max(10, ...replay.points.flat()), [replay.points]);
  const lines = useMemo(
    () =>
      colors.map((_, seat) => {
        // A step line that only keeps the moments the score changed (a game has thousands of actions).
        let prev = -1;
        // Players on the same score would draw one line over another: each sits a hair apart.
        const at = (vp: number) => PAD + (1 - vp / top) * (GRAPH_H - 2 * PAD) + (seat - (colors.length - 1) / 2) * 1.6;
        const pts: string[] = [];
        replay.points.forEach((p, i) => {
          if (p[seat] === prev && i < replay.points.length - 1) return;
          const x = (i / total) * GRAPH_W;
          const y = at(p[seat]);
          if (prev >= 0) pts.push(`${x},${at(prev)}`);
          pts.push(`${x},${y}`);
          prev = p[seat];
        });
        return pts.join(' ');
      }),
    [replay.points, colors, top, total],
  );
  const now = replay.points[Math.min(step, replay.points.length - 1)];

  const key = 'btn h-9 min-h-0 w-9 min-w-0 p-0';
  return (
    <div className="paper flex flex-col gap-2 p-2.5 sm:p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-1">
          <button type="button" className={key} onClick={() => onTurn(-1)} disabled={step <= 0} title="Previous turn (Shift+←)" aria-label="Previous turn">
            <SkipBack size={16} />
          </button>
          <button type="button" className={key} onClick={() => onStep(-1)} disabled={step <= 0} title="Back one action (←)" aria-label="Back one action">
            <StepBack size={16} />
          </button>
          <button type="button" className={`${key} btn-primary`} onClick={onPlay} title={playing ? 'Pause (Space)' : 'Play (Space)'} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" className={key} onClick={() => onStep(1)} disabled={step >= replay.total} title="Forward one action (→)" aria-label="Forward one action">
            <StepForward size={16} />
          </button>
          <button type="button" className={key} onClick={() => onTurn(1)} disabled={step >= replay.total} title="Next turn (Shift+→)" aria-label="Next turn">
            <SkipForward size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeed(s)}
              aria-pressed={speed === s}
              className={`h-9 rounded-md border-2 px-2 text-xs font-black transition ${speed === s ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white/40 hover:border-ink/60'}`}
            >
              {s}×
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink-soft tabular">
          {turnLabel}
          <span className="ml-2 text-xs font-semibold text-ink-faint">
            action {step}/{replay.total}
          </span>
        </p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {colors.map((c, seat) => (
            <li key={seat} className="flex items-center gap-1 text-xs font-bold">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-ink" style={{ background: PLAYER_COLORS[c].hex }} />
              <span className="max-w-24 truncate">{names[seat]}</span>
              <span className="display tabular">{now?.[seat] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        ref={track}
        className="relative cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          seekAt(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) seekAt(e.clientX);
        }}
      >
        {moves.length > 0 && (
          <div className="relative h-6" aria-label="Mistakes and blunders">
            {moves.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSeek(m.step)}
                title={m.label}
                aria-label={m.label}
                className={`absolute top-0 grid h-5 min-w-5 -translate-x-1/2 place-items-center rounded-sm border-2 border-ink px-0.5 text-[11px] leading-none font-black transition hover:scale-125 ${m.kind === 'blunder' ? 'z-10 text-paper' : 'text-ink'}`}
                style={{ left: pct(m.step), background: MARKER[m.kind].tone }}
              >
                {MARKER[m.kind].icon}
              </button>
            ))}
          </div>
        )}
        <div className="relative h-6">
          {replay.markers.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(m.step)}
              title={m.label}
              aria-label={m.label}
              className="absolute top-0 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full border-2 border-ink text-white transition hover:scale-125"
              style={{ left: pct(m.step), background: MARKER[m.kind].tone }}
            >
              {MARKER[m.kind].icon}
            </button>
          ))}
        </div>
        <div className="relative h-3 rounded-sm border-2 border-ink bg-white/60">
          <div className="absolute inset-y-0 left-0 bg-ink/25" style={{ width: pct(step) }} />
          {replay.turns.map((t, i) => (
            <span key={i} className="absolute inset-y-0 w-px bg-ink/30" style={{ left: pct(t.step) }} />
          ))}
        </div>
        <div className="relative mt-1.5">
        <svg viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} preserveAspectRatio="none" className="block h-20 w-full rounded-sm border-2 border-ink/20 bg-white/40 sm:h-24" role="img" aria-label="Victory points over time">
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={GRAPH_W} y1={GRAPH_H * f} y2={GRAPH_H * f} stroke="rgb(19 26 29 / 0.1)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {lines.map((pts, seat) => (
            <polyline key={seat} points={pts} fill="none" stroke={PLAYER_COLORS[colors[seat]].hex} strokeWidth={3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <span className="pointer-events-none absolute left-1.5 top-0.5 text-[10px] font-black uppercase tracking-caps text-ink-faint">Victory points</span>
        <span className="pointer-events-none absolute right-1.5 top-0.5 text-[10px] font-black text-ink-faint tabular">{top}</span>
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-ink" style={{ left: pct(step) }} />
      </div>
    </div>
  );
}
