'use client';

import { Check } from 'lucide-react';
import type { PlayerColor } from '@/engine/types';
import { COLOR_ORDER, PLAYER_COLORS } from '@/shared/colors';

export function ColorPicker({
  value,
  onChange,
  taken = [],
}: {
  value: PlayerColor;
  onChange: (c: PlayerColor) => void;
  taken?: PlayerColor[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Player color">
      {COLOR_ORDER.map((c) => {
        const info = PLAYER_COLORS[c];
        const isTaken = taken.includes(c) && c !== value;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={`${info.label}${isTaken ? ' (taken)' : ''}`}
            title={isTaken ? `${info.label} is taken` : info.label}
            disabled={isTaken}
            onClick={() => onChange(c)}
            className={`grid h-10 w-10 place-items-center rounded-md border-2 border-ink transition disabled:cursor-not-allowed disabled:opacity-30 ${
              value === c ? 'outline-3 outline-offset-2 outline-sea-500' : 'hover:-translate-y-0.5'
            }`}
            style={{ background: info.hex }}
          >
            {value === c && <Check size={18} strokeWidth={3.5} color={info.ink} />}
          </button>
        );
      })}
    </div>
  );
}
