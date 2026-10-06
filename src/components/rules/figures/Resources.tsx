import { TERRAIN_COLORS } from '@/client/palette';
import type { Card, Terrain } from '@/engine';
import { Arrow, HexTile, MiniCard } from './art-basic';

const ROWS: { terrain: Terrain; card?: Card }[] = [
  { terrain: 'forest', card: 'lumber' },
  { terrain: 'hills', card: 'brick' },
  { terrain: 'pasture', card: 'wool' },
  { terrain: 'fields', card: 'grain' },
  { terrain: 'mountains', card: 'ore' },
  { terrain: 'desert' },
  { terrain: 'gold' },
];

/** Each producing terrain with the card it pays out. */
export function ResourcesFigure() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
      {ROWS.map(({ terrain, card }) => (
        <div key={terrain} className="flex items-center gap-1.5" title={TERRAIN_COLORS[terrain].label}>
          <HexTile color={TERRAIN_COLORS[terrain].top} side={TERRAIN_COLORS[terrain].side} size={40} />
          <Arrow size={16} />
          {card ? (
            <MiniCard card={card} w={28} />
          ) : (
            <span className="display grid h-9 min-w-9 place-items-center rounded-md border-2 border-dashed border-ink/50 px-1 text-sm font-black text-ink">
              {terrain === 'desert' ? 'none' : 'any'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
