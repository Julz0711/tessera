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
            className={`grid h-10 w-10 place-items-center rounded-[5px] border-[1.5px] border-ink transition disabled:cursor-not-allowed disabled:opacity-30 ${
              value === c ? '-translate-y-0.5 shadow-[0_3px_0_0_#1f1a14]' : 'hover:-translate-y-0.5'
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
