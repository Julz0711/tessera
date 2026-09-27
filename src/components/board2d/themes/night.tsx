import { Glow } from './glow';
import type { BarbarianShipGlyph } from './types';

/** Night on the 2D board: the classic longship hull under a dark sail, with two lanterns glowing on it. */
export const nightShip: BarbarianShipGlyph = ({ danger, wood }) => {
  const hull = danger ? '#c23a2a' : '#241c14';
  const sail = danger ? '#4a2a28' : '#2b2f3c';
  const lantern = '#ffc15a';
  return (
    <g pointerEvents="none">
      <path d="M-26 8h52l-10 14h-32Z" fill={hull} stroke="#0d0a07" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M26 8q14-2 14-14q0-8-8-8" fill="none" stroke={wood.post} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="-1.5" y="-36" width="3" height="45" fill="#171310" />
      <path d="M-18-32h34q-4 16 0 32h-34q4-16 0-32Z" fill={sail} stroke="#0d0a07" strokeWidth="2.5" strokeLinejoin="round" />
      {/* two lanterns glowing against the dark sail */}
      <Glow x={-9} y={-20} r={3} color={lantern} />
      <Glow x={9} y={-8} r={3} color={lantern} />
      <circle cx="-14" cy="15" r="4" fill="#171310" stroke="#0d0a07" strokeWidth="1.2" />
      <circle cx="0" cy="16" r="4" fill={sail} stroke="#0d0a07" strokeWidth="1.2" />
      <circle cx="14" cy="15" r="4" fill="#171310" stroke="#0d0a07" strokeWidth="1.2" />
    </g>
  );
};
