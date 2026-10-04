import { PLAYER_COLORS } from '@/shared/colors';
import type { PlayerColor } from '@/engine';

const INK = '#1f1a14';

/** A crown (metropolis, 4th and 5th improvement level). */
export function Crown({ size = 16, fill = '#f2b33d' }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path d="M3 18 2.5 7l5.5 5 4-7 4 7 5.5-5L21 18Z" fill={fill} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="3" y="18" width="18" height="3.5" rx="1" fill={fill} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** A five-point star (the level-3 ability). */
export function Star({ size = 16, fill = '#f2b33d' }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path d="m12 2.5 2.9 6.2 6.7.8-5 4.6 1.4 6.7L12 17.4 6 20.8l1.4-6.7-5-4.6 6.7-.8Z" fill={fill} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** A knight like the board's disc: crest in the owner's colour, strength as pips; dim when inactive. */
export function KnightDisc({ level, active, color = 'blue', size = 54 }: { level: 1 | 2 | 3; active: boolean; color?: PlayerColor; size?: number }) {
  const c = PLAYER_COLORS[color];
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" role="img" aria-label={`${['basic', 'strong', 'mighty'][level - 1]} knight, ${active ? 'active' : 'inactive'}`} className="shrink-0">
      <circle cx="27" cy="27" r="23" fill={active ? '#f6eddb' : '#bdb4a0'} stroke={INK} strokeWidth="2.6" strokeDasharray={active ? undefined : '5 4'} opacity={active ? 1 : 0.75} />
      <path
        d="M14 10h26v9c0 9-5 14-13 17-8-2.5-13-8-13-17Z"
        fill={active ? c.hex : '#8d856f'}
        stroke={active ? c.dark : '#5e584a'}
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.8}
      />
      {Array.from({ length: level }, (_, i) => (
        <circle key={i} cx={27 + (i - (level - 1) / 2) * 9} cy="44" r="3.3" fill={active ? '#f2b33d' : '#9c957f'} stroke={INK} strokeWidth="1.6" />
      ))}
    </svg>
  );
}

/** A barbarian longship (or, dark, the pirate) side-on. */
export function LongShip({ size = 40, dark = false }: { size?: number; dark?: boolean }) {
  const hull = dark ? '#2d2c33' : '#9c6f42';
  const sail = dark ? '#3b3a42' : '#f6eddb';
  const stripe = dark ? '#8a1f14' : '#a83b2e';
  return (
    <svg width={size} height={size} viewBox="-34 -42 76 70" aria-hidden className="shrink-0">
      <path d="M-26 8h52l-10 14h-32Z" fill={hull} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M26 8q14-2 14-14q0-8-8-8" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="-1.5" y="-36" width="3" height="45" fill="#6b4a2b" />
      <path d="M-18-32h34q-4 16 0 32h-34q4-16 0-32Z" fill={sail} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="-7" y="-32" width="5" height="32" fill={stripe} />
      <rect x="6" y="-32" width="5" height="32" fill={stripe} />
    </svg>
  );
}

/** Two crossed swords: the island's defence. */
export function Swords({ size = 28, color = '#1f1a14' }: { size?: number; color?: string }) {
  const sword = (a: number) => (
    <g transform={`rotate(${a})`}>
      <path d="M0 -14 L2.4 -10.5 L2.4 3.5 L-2.4 3.5 L-2.4 -10.5 Z" />
      <rect x="-6" y="3.5" width="12" height="2.6" rx="1" />
      <rect x="-1.3" y="6.1" width="2.6" height="5" />
      <circle cy="12.4" r="2.1" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="-16 -16 32 32" aria-hidden className="shrink-0" fill={color} stroke={INK} strokeWidth="0.8" strokeLinejoin="round">
      {sword(-40)}
      {sword(40)}
    </svg>
  );
}

/** A thick arrow pointing right. */
export function Arrow({ size = 22, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 30 18" aria-hidden className="shrink-0">
      <path d="M2 9h22M17 2l8 7-8 7" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
