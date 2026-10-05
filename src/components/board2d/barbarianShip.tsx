import type { BoardThemeId } from '@/client/themes';
import { THEME_BARBARIAN_SHIPS, type BarbarianShipGlyph } from './themes';

type PierColors = { deck: string; plank: string; post: string };

/** The classic barbarian longship: hull, curled prow, a striped sail and a few shields along the gunwale. */
const classicShip: BarbarianShipGlyph = ({ danger, wood }) => {
  const hull = danger ? '#8a1f14' : wood.deck;
  const sail = danger ? '#f3d9d3' : '#f6eddb';
  const stripe = danger ? '#8a1f14' : '#a83b2e';
  return (
    <g pointerEvents="none">
      <path d="M-26 8h52l-10 14h-32Z" fill={hull} stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round" />
      {/* curled prow */}
      <path d="M26 8q14-2 14-14q0-8-8-8" fill="none" stroke={wood.post} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="-1.5" y="-36" width="3" height="45" fill={wood.post} />
      <path d="M-18-32h34q-4 16 0 32h-34q4-16 0-32Z" fill={sail} stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="-7" y="-32" width="5" height="32" fill={stripe} />
      <rect x="6" y="-32" width="5" height="32" fill={stripe} />
      <circle cx="-14" cy="15" r="4" fill={stripe} stroke="#1f1a14" strokeWidth="1.2" />
      <circle cx="0" cy="16" r="4" fill={sail} stroke="#1f1a14" strokeWidth="1.2" />
      <circle cx="14" cy="15" r="4" fill={stripe} stroke="#1f1a14" strokeWidth="1.2" />
    </g>
  );
};

/** The barbarians' ship in the board theme's style (the classic longship where a theme has none), centred on (0, 0), about 80 units wide. */
export function BarbarianShip({ theme, danger, wood }: { theme: BoardThemeId; danger: boolean; wood: PierColors }) {
  return <>{(THEME_BARBARIAN_SHIPS[theme] ?? classicShip)({ danger, wood })}</>;
}
