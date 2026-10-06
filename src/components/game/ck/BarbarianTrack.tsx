'use client';

import { Sailboat, Swords } from 'lucide-react';
import { BARBARIAN_DISTANCE } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { PALETTES, type BoardThemeId } from '@/client/themes';
import { BarbarianShip } from '@/components/board2d/barbarianShip';
import { barbarianStatus, describeBarbarians } from './BarbarianMeter';

/** A step's circumradius, in px. */
const R = 20;
/** How far each step sits either side of the column, so neighbouring steps touch (a strip of honeycomb). */
const ZIG = (Math.sqrt(3) / 4) * R;
const HEX_W = (Math.sqrt(3) / 2) * R;

function hexPoints(cx: number, cy: number, r: number): string {
  const w = (Math.sqrt(3) / 2) * r;
  return [
    [cx, cy - r],
    [cx + w, cy - r / 2],
    [cx + w, cy + r / 2],
    [cx, cy + r],
    [cx - w, cy + r / 2],
    [cx - w, cy - r / 2],
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
}

/**
 * The barbarians' voyage (Knights & Barbarians) as a tall, see-through track beside the board: their
 * strength against the knights' defense on top, then a zigzag of sea-steps from the ship's start down
 * to the landing (the last, orange step), the ship in the board theme's style on its current step.
 */
export function BarbarianTrack({ view, theme }: { view: PlayerView; theme: BoardThemeId }) {
  if (view.mode !== 'ck') return null;
  const s = barbarianStatus(view);
  const wood = PALETTES[theme].pier ?? { deck: '#9c6f42', plank: '#8a6139', post: '#6b4a2b' };
  const steps = BARBARIAN_DISTANCE + 1;
  const width = 2 * (HEX_W + ZIG) + 4;
  // Room above the first step for the ship's mast.
  const top = 14;
  const height = top + 2 * R + (steps - 1) * 1.5 * R + 4;
  const cx = width / 2;
  const at = (i: number) => ({ x: cx + (i % 2 ? 1 : -1) * ZIG, y: top + R + 2 + i * 1.5 * R });
  const ship = at(Math.min(s.position, BARBARIAN_DISTANCE));
  const label = describeBarbarians(s);
  return (
    <div role="status" aria-label={label} title={label} className="grid justify-items-center gap-2 rounded-lg bg-sea-900/55 px-2.5 pb-3 pt-2.5 text-paper">
      <div className="display grid grid-cols-[auto_2ch_auto_2ch] items-center gap-x-1 text-lg font-black leading-none">
        <Sailboat size={16} strokeWidth={2.6} className={s.losing ? 'text-[#ff8a73]' : ''} aria-hidden />
        <span className={s.losing ? 'text-[#ff8a73]' : ''}>{s.strength}</span>
        <Swords size={16} strokeWidth={2.6} className={`ml-1 ${s.losing ? '' : 'text-[#8fe0a8]'}`} aria-hidden />
        <span className={s.losing ? '' : 'text-[#8fe0a8]'}>{s.defense}</span>
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
        {Array.from({ length: steps }, (_, i) => {
          const p = at(i);
          const landing = i === BARBARIAN_DISTANCE;
          return (
            <polygon
              key={i}
              points={hexPoints(p.x, p.y, R * 0.94)}
              fill={landing ? (s.danger ? '#e0503a' : '#f2994a') : wood.deck}
              stroke={landing ? '#8a3a14' : wood.post}
              strokeWidth="2"
              strokeLinejoin="round"
              opacity={landing ? 1 : 0.75}
            />
          );
        })}
        <g transform={`translate(${ship.x} ${ship.y}) scale(0.62)`}>
          <BarbarianShip theme={theme} danger={s.danger} wood={wood} />
        </g>
      </svg>
    </div>
  );
}
