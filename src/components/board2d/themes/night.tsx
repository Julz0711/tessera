import { Glow } from './glow';
import { castlePath, OUTLINE, pc, Pennant } from './shared';
import type { BarbarianShipGlyph, MetropolisGlyph, PieceGlyph, ThemePieces } from './types';

const LANTERN = '#ffc15a';

/** Night's settlement: the classic house, a warm light glowing behind one window. */
const nightSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g>
      <path d={`M${x - 17} ${y + 14}v-17l17-14 17 14v17Z`} fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round" />
      <Glow x={x} y={y + 5} r={2.2} color={LANTERN} />
    </g>
  );
};

/** Night's city: the classic city, warm light glowing in a couple of its windows. */
const nightCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g>
      <path d={`M${x - 26} ${y + 17}v-18l12-9 12 9v-18h9v-8h8v8h9v36Z`} fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round" />
      <Glow x={x - 14} y={y + 8} r={2} color={LANTERN} />
      <Glow x={x + 16} y={y + 5} r={2} color={LANTERN} />
    </g>
  );
};

/** Night's metropolis: the castle with lit windows and a banner in the track's colour. */
const nightMetropolis: MetropolisGlyph = ({ x, y, color, accent }) => {
  const c = pc(color);
  return (
    <g>
      <Pennant x={x} y={y - 30} h={13} accent={accent} dark={c.dark} />
      <path d={castlePath(x, y)} fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round" />
      <path d={`M${x - 5} ${y + 17}v-8a5 5 0 0 1 10 0v8Z`} fill={c.dark} />
      <Glow x={x - 21} y={y - 2} r={2} color={LANTERN} />
      <Glow x={x + 21} y={y - 2} r={2} color={LANTERN} />
      <Glow x={x} y={y - 16} r={2.2} color={LANTERN} />
    </g>
  );
};

export const nightPieces: ThemePieces = { settlement: nightSettlement, city: nightCity, metropolis: nightMetropolis };

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
