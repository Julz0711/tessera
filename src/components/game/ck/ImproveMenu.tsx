'use client';

import { Crown, Star } from 'lucide-react';
import { TRACKS, improvementBlocker, improvementCost, type Track } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { TRACK_STYLE } from '@/client/progressText';
import { play } from '@/client/sound';
import { api } from '@/client/store';
import { CostDots } from '../BuildCostsCard';
import { MiniArt } from '../cardArt';

const LEVELS = [1, 2, 3, 4, 5];

/**
 * Your city improvements at a glance, as the Improve key's icon: a column per track, filled from
 * the bottom up to the level reached (like the flip charts in the box).
 */
export function ProgressGrid({ view }: { view: PlayerView }) {
  const p = view.players[view.viewer!];
  return (
    <span className="dim-group grid grid-flow-col gap-1" aria-hidden>
      {TRACKS.map((t) => (
        <span key={t} className="flex flex-col-reverse gap-[1.5px]">
          {LEVELS.map((n) => (
            <span
              key={n}
              className="h-[4px] w-[8px] rounded-[1px] border-[1.5px] border-current"
              style={{ background: n <= p.improvements[t] ? TRACK_STYLE[t].color : 'var(--color-paper)' }}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

/**
 * One track in the Improve menu: its level as five steps in the track's colour (★ marks the
 * ability at 3, the crown the metropolis), the next level's price in commodity pips, and a click
 * builds it straight away.
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
      className="btn relative size-20 flex-col gap-1 px-1 py-1 text-[11px]"
      onClick={() => {
        play('click');
        void api.act({ type: 'improveCity', track });
        onDone();
      }}
    >
      <span className="flex items-center gap-1 leading-none">
        <span className={off ? 'opacity-50 grayscale' : ''}>
          <MiniArt card={style.commodity} size={14} />
        </span>
        {style.label}
      </span>
      <span className="flex items-end gap-[3px]" aria-label={`Level ${level} of 5`}>
        {LEVELS.map((n) => (
          <span
            key={n}
            className={`grid w-3 place-items-center rounded-[2px] border ${off ? 'border-current' : 'border-ink'}`}
            style={{ height: 8 + n * 2.5, background: n <= level && !off ? style.color : 'transparent', color: off ? undefined : style.ink }}
          >
            {n === 3 && <Star size={7} strokeWidth={4} className={off ? '' : n <= level ? '' : 'text-ink/40'} />}
          </span>
        ))}
      </span>
      {level < 5 ? (
        cost > 0 ? (
          <CostDots cost={{ [style.commodity]: cost }} hand={p.hand} />
        ) : (
          <span className="text-[9px] font-black uppercase leading-[10px]">Free</span>
        )
      ) : (
        <span className="text-[9px] font-black uppercase leading-[10px]">Max</span>
      )}
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
