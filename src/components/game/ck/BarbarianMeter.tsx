'use client';

import { Castle, Sailboat, Swords } from 'lucide-react';
import { BARBARIAN_DISTANCE, barbarianStrength, knightStrength } from '@/engine';
import type { PlayerView } from '@/engine/view';

/** The barbarians' voyage in numbers: where the ship is, how far it has to go, strength against defense. */
export function barbarianStatus(view: PlayerView) {
  const position = view.barbarian.position;
  const left = Math.max(1, BARBARIAN_DISTANCE - position);
  const strength = barbarianStrength(view);
  const defense = view.players.reduce((n, _, seat) => n + knightStrength(view, seat), 0);
  return { position, left, strength, defense, danger: left <= 2, losing: strength > defense };
}

export function describeBarbarians(s: ReturnType<typeof barbarianStatus>): string {
  const when = s.left === 1 ? 'They attack on the next ship roll' : `${s.left} more ship rolls until they attack`;
  return `Barbarians: ${when}. Their strength ${s.strength} (one per city) against the knights' defense ${s.defense} (active knights).`;
}

/**
 * Barbarian progress at a glance (Knights & Barbarians), so it stays in view however the board is
 * zoomed or turned: the voyage as a row of steps with the ship on its current one and the attack as the
 * last, orange step (as on the board), and the barbarians' strength against the knights' defense. On wide screens it's a HUD panel
 * (under the log unless moved); `compact` is the tile leading the players strip on phones.
 */
export function BarbarianMeter({ view, compact = false }: { view: PlayerView; compact?: boolean }) {
  if (view.mode !== 'ck') return null;
  const s = barbarianStatus(view);
  const label = describeBarbarians(s);
  const warn = s.danger ? 'text-[#ff8a73]' : '';
  const versus = (
    <span className="flex items-center gap-1 font-black tabular">
      <span className={`flex items-center gap-0.5 ${s.losing ? 'text-[#ff8a73]' : ''}`} title="Barbarian strength: cities on the board">
        <Sailboat size={compact ? 11 : 14} strokeWidth={2.5} />
        <span className="min-w-[2ch]">{s.strength}</span>
      </span>
      <span className="text-[10px] font-bold opacity-60">vs</span>
      <span className={`flex items-center gap-0.5 ${s.losing ? '' : 'text-[#8fe0a8]'}`} title="Knight defense: active knights">
        <Swords size={compact ? 11 : 14} strokeWidth={2.5} />
        <span className="min-w-[2ch]">{s.defense}</span>
      </span>
    </span>
  );
  const toGo = s.left === 1 ? 'Attack next!' : `${s.left} to go`;

  if (compact) {
    // Narrow, so the whole table fits beside it on a phone: steps to go on top, ships against knights below.
    return (
      <div
        role="status"
        aria-label={label}
        title={label}
        className={`glass grid content-center justify-items-center gap-0.5 px-1.5 py-1 text-[11px] text-paper ${s.danger ? 'border-danger! shadow-[inset_0_0_0_2px_var(--color-danger)]' : ''}`}
      >
        <span className={`flex items-center gap-1 text-[15px] font-black leading-none tabular ${warn}`}>
          <Sailboat size={13} strokeWidth={2.5} />
          {s.left === 1 ? '!' : s.left}
        </span>
        <span className="flex items-center gap-1 font-black leading-none tabular">
          <span className={s.losing ? 'text-[#ff8a73]' : ''}>{s.strength}</span>
          <span className="text-[9px] font-bold opacity-60">vs</span>
          <span className={`flex items-center gap-px ${s.losing ? '' : 'text-[#8fe0a8]'}`}>
            <Swords size={10} strokeWidth={2.6} />
            {s.defense}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div role="status" aria-label={label} title={label} className={`glass grid gap-2 px-3 py-2.5 text-sm text-paper ${s.danger ? 'border-danger! shadow-[inset_0_0_0_2px_var(--color-danger)]' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="label-light flex items-center gap-1.5">
          <Sailboat size={13} strokeWidth={2.5} /> Barbarians
        </span>
        <span className={`text-xs font-extrabold ${s.danger ? 'text-[#ff8a73]' : 'text-foam/80'}`}>{toGo}</span>
      </div>
      <div className="flex items-center gap-3">
        {/* the voyage: passed steps, the ship's step, steps still ahead, and last the attack step, in
            the board track's orange so it reads as one more step, not as the step before it */}
        <span className="flex min-w-0 flex-1 items-center gap-[3px]" aria-hidden>
          {Array.from({ length: BARBARIAN_DISTANCE }, (_, i) =>
            i === s.position ? (
              <span key={i} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md ${s.danger ? 'bg-danger' : 'bg-paper text-ink'}`}>
                <Sailboat size={13} strokeWidth={2.6} />
              </span>
            ) : (
              <span key={i} className={`h-2.5 min-w-1.5 flex-1 rounded-[3px] ${i < s.position ? 'bg-paper/35' : 'border-2 border-paper/40'}`} />
            ),
          )}
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#f2994a] text-ink" title="The attack">
            <Castle size={12} strokeWidth={2.6} />
          </span>
        </span>
        <span className="h-5 w-px shrink-0 bg-white/15" />
        {versus}
      </div>
    </div>
  );
}
