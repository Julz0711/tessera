import { FlatDie } from '@/components/game/Dice';
import { MiniArt } from '@/components/game/cardArt';
import { RobberGlyph } from '@/components/ui/Glyphs';
import { MiniBoard, type MiniHex, type MiniPieces } from './MiniBoard';
import { Arrow } from './art-ck';

const HEXES: MiniHex[] = [
  { q: 0, r: 0, terrain: 'pasture', token: 8 },
  { q: 1, r: 0, terrain: 'forest', token: 6 },
  { q: 0, r: 1, terrain: 'mountains', token: 5 },
];
const PIECES: MiniPieces = { robber: 0, settlements: [{ at: [0, 2], seat: 1 }] };

const FAN = ['lumber', 'brick', 'wool', 'grain', 'ore', 'brick'] as const;

/** Rulebook figure: robber on a tile beside a house, 7 -> move -> steal, and 8+ cards -> discard half. */
export function RobberFigure() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
      <div className="min-w-[170px] flex-1" style={{ maxWidth: 230 }}>
        <MiniBoard hexes={HEXES} pieces={PIECES} height={170} label="The robber sits on a tile; the settlement beside it can be robbed" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex gap-0.5">
            <FlatDie value={3} size={26} />
            <FlatDie value={4} size={26} />
          </span>
          <Arrow />
          <RobberGlyph size={26} className="text-ink" />
          <Arrow />
          <span className="relative inline-grid">
            <MiniArt card="ore" size={28} />
            <span className="display absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full border border-ink bg-paper text-[10px] font-black leading-none text-ink">1</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="display text-lg font-black leading-none text-ink">8+</span>
          <span className="flex gap-1">
            {FAN.map((c, i) => (
              <span key={i} className="relative " style={{ opacity: i < 3 ? 1 : 0.5 }}>
                <MiniArt card={c} size={24} />
                {i >= 3 && (
                  <svg className="absolute inset-0" viewBox="0 0 24 24" aria-hidden>
                    <path d="m3 3 18 18M21 3 3 21" stroke="#b3261e" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
