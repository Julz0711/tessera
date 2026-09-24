'use client';

import { Ship, Shield } from 'lucide-react';
import { BARBARIAN_DISTANCE, barbarianStrength, knightStrength } from '@/engine';
import type { PlayerView } from '@/engine/view';

/** The barbarian ship's voyage and the balance of power when it lands. */
export function BarbarianTrack({ view }: { view: PlayerView }) {
  const strength = barbarianStrength(view);
  const defense = view.players.reduce((n, _, s) => n + knightStrength(view, s), 0);
  const pos = view.barbarian.position;
  const danger = pos >= BARBARIAN_DISTANCE - 2;
  return (
    <div className={`paper-flat grid gap-1.5 px-3 py-2 ${danger ? 'ring-4 ring-terracotta/70' : ''}`} title="Barbarians attack when the ship reaches the island">
      <div className="flex items-center justify-between text-xs font-extrabold">
        <span className="flex items-center gap-1">
          <Ship size={14} /> Barbarians {view.barbarian.attacks > 0 && <span className="font-bold text-ink-faint">· {view.barbarian.attacks} attack{view.barbarian.attacks === 1 ? '' : 's'}</span>}
        </span>
        <span className={`flex items-center gap-1 tabular ${defense >= strength ? 'text-moss' : 'text-danger'}`}>
          {strength} <span className="text-ink-faint">vs</span> <Shield size={12} /> {defense}
        </span>
      </div>
      <div className="flex items-center gap-1" aria-label={`Ship at ${pos} of ${BARBARIAN_DISTANCE}`}>
        {Array.from({ length: BARBARIAN_DISTANCE + 1 }, (_, i) => (
          <span
            key={i}
            className={`grid h-4 flex-1 place-items-center rounded-sm border border-ink/30 ${
              i === BARBARIAN_DISTANCE ? 'bg-moss/60' : i < pos ? 'bg-ink/50' : 'bg-white/40'
            }`}
          >
            {i === pos && <Ship size={11} className={danger ? 'text-danger' : 'text-ink'} />}
          </span>
        ))}
      </div>
    </div>
  );
}
