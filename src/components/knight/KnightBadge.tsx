import { useId } from 'react';
import type { PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { KNIGHT_STEEL } from '@/shared/knight';

/** Portrait of the player's knight: one basic knight in the player's color, with its visor down. */
export function KnightBadge({
  color,
  size = 56,
  ring = true,
}: {
  color: PlayerColor;
  size?: number;
  ring?: boolean;
}) {
  const pc = PLAYER_COLORS[color];
  const clip = useId().replace(/:/g, '');
  const steel = KNIGHT_STEEL;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Knight">
      <defs>
        <clipPath id={`ring-${clip}`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      {ring && <circle cx="50" cy="50" r="48" fill={pc.hex} opacity="0.22" />}
      <g clipPath={ring ? `url(#ring-${clip})` : undefined}>
        {/* cape */}
        <path d="M24 60 50 50l26 10 8 40H16Z" fill={pc.hex} stroke={pc.dark} strokeWidth="2.5" />
        {/* shoulders & tabard */}
        <path d="M22 100c0-20 11-34 28-34s28 14 28 34Z" fill={steel.base} stroke={steel.trim} strokeWidth="3" />
        <path d="M38 70h24l-3 30H41Z" fill={pc.hex} stroke={pc.dark} strokeWidth="2" />
        <path d="M50 74v22M43 84h14" stroke={pc.ink} strokeWidth="2.5" strokeLinecap="round" />
        {/* plume */}
        <path d="M50 14c3-9 14-13 21-9-9 1-13 7-15 13Z" fill={pc.hex} stroke={pc.dark} strokeWidth="1.5" />
        {/* helmet with the visor down */}
        <path d="M27 67V43c0-17 10-28 23-31 13 3 23 14 23 31v24Z" fill={steel.base} stroke={steel.trim} strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="50" cy="46" rx="17.5" ry="20" fill={steel.trim} />
        <ellipse cx="50" cy="46" rx="16" ry="18.5" fill={steel.visor} />
        <path d="M37 41h26M37 48h26M50 30v32" stroke={steel.base} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
        <path d="M27 61h46" stroke={steel.trim} strokeWidth="3" />
      </g>
    </svg>
  );
}
