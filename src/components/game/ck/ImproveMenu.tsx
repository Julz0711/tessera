'use client';

import { Crown } from 'lucide-react';
import { TRACKS, improvementBlocker, improvementCost, type Track } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { TRACK_STYLE } from '@/client/progressText';
import { play } from '@/client/sound';
import { api } from '@/client/store';
import { MiniArt } from '../cardArt';

const LEVELS = [1, 2, 3, 4, 5];

/**
 * Your city improvements at a glance, as the Improve key's icon: a bar per track on a common base,
 * filled from the bottom up to the level reached (a sliver shows even at 0, so the three read as bars).
 */
export function ProgressGrid({ view }: { view: PlayerView }) {
  const p = view.players[view.viewer!];
  return (
    <span className="dim-group flex flex-col items-stretch gap-0" aria-hidden>
      <span className="flex items-end gap-0.75 px-0.5">
        {TRACKS.map((t) => (
          <span key={t} className="relative h-5.5 w-2 overflow-hidden rounded-t-xs border-2 border-b-0 border-current bg-paper">
            <span className="absolute inset-x-0 bottom-0" style={{ height: `${Math.max(p.improvements[t], 0.4) * 20}%`, background: TRACK_STYLE[t].color }} />
          </span>
        ))}
      </span>
      <span className="h-0.5 rounded-full bg-current" />
    </span>
  );
}

/**
 * One track in the Improve menu, price first: the track's name on its colour, the commodity you pay
 * for the next level with how many, and the level reached as a slim five-step bar. A click builds it
 * straight away; the ability at 3 and the metropolis from 4 are in the tooltip.
 */
function TrackKey({ view, track, onDone }: { view: PlayerView; track: Track; onDone: () => void }) {
  const me = view.viewer!;
  const style = TRACK_STYLE[track];
  const p = view.players[me];
  const level = p.improvements[track];
  const blocker = improvementBlocker(view, me, track);
  const cost = improvementCost(view, me, track);
  const myTurn = view.phase === 'play' && view.turn.seat === me && view.turn.rolled && view.pending.length === 0;
  const metropolis = view.metropolis[track] === me;
  const next = level + 1;
  const off = !myTurn || !!blocker;
  const hint = level >= 5 ? `${style.label}: top level reached` : `${style.label} level ${next}${next === 3 ? ` unlocks ${style.ability}` : next >= 4 ? ' can win the metropolis' : ''}${blocker ? `. ${blocker}` : ''}`;
  return (
    <button
      type="button"
      role="menuitem"
      disabled={off}
      title={hint}
      aria-label={`${hint}. Level ${level} of 5`}
      className="btn relative h-20 w-full flex-col items-stretch gap-0 overflow-visible p-0 sm:w-24"
      onClick={() => {
        play('click');
        void api.act({ type: 'improveCity', track });
        onDone();
      }}
    >
      <span className="rounded-t-[2px] border-b-2 border-ink py-0.5 text-center text-[11px] font-black uppercase leading-4 tracking-caps" style={{ background: style.color, color: style.ink }}>
        {style.label}
      </span>
      <span className="flex flex-1 items-center justify-center gap-1 text-base font-black leading-none">
        {level >= 5 ? (
          <span className="text-xs uppercase tracking-caps">Max</span>
        ) : cost > 0 ? (
          <>
            <MiniArt card={style.commodity} size={22} />
            <span className="tabular">×{cost}</span>
          </>
        ) : (
          <span className="text-xs uppercase tracking-caps">Free</span>
        )}
      </span>
      <span className="flex items-center gap-1.5 px-1.5 pb-1.5">
        <span className="flex flex-1 gap-px" aria-hidden>
          {LEVELS.map((n) => (
            <span key={n} className="h-1.5 flex-1 rounded-[1px] border border-ink" style={{ background: n <= level ? style.color : 'transparent' }} />
          ))}
        </span>
        <span className="text-[10px] font-black leading-none tabular">L{level}</span>
      </span>
      {metropolis && (
        <span className="hex-badge hex-badge-amber -right-1.5 -top-2" title="Your metropolis">
          <Crown size={10} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/** The three tracks, side by side, for the Improve key's menu. */
export function ImproveOptions({ view, onDone }: { view: PlayerView; onDone: () => void }) {
  return (
    <>
      {TRACKS.map((t) => (
        <TrackKey key={t} view={view} track={t} onDone={onDone} />
      ))}
    </>
  );
}

/** How many tracks you could improve right now (the Improve key's badge). */
export function improvableCount(view: PlayerView): number {
  const me = view.viewer;
  if (me === null || view.phase !== 'play' || view.turn.seat !== me || !view.turn.rolled || view.pending.length) return 0;
  return TRACKS.filter((t) => !improvementBlocker(view, me, t)).length;
}
