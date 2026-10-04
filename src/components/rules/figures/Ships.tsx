import { MiniBoard, type MiniHex, type MiniPieces } from './MiniBoard';
import { LongShip } from './art-ck';

const HEXES: MiniHex[] = [
  { q: 0, r: 0, terrain: 'sea' },
  { q: -1, r: 0, terrain: 'hills', token: 5 },
  { q: 1, r: 0, terrain: 'forest', token: 9 },
];
const PIECES: MiniPieces = {
  settlements: [
    { at: [1, 1], seat: 0 },
    { at: [2, 4], seat: 0 },
  ],
  ships: [
    { at: [0, 5], seat: 0 },
    { at: [0, 0], seat: 0 },
    { at: [0, 1], seat: 0 },
  ],
};

/** Rulebook figure: a ship route from one coast to the other, and the pirate beside it. */
export function ShipsFigure() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="min-w-[200px] flex-1" style={{ maxWidth: 300 }}>
        <MiniBoard hexes={HEXES} pieces={PIECES} height={150} label="A route of ships from one coast to another" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <LongShip size={52} dark />
        <span className="label text-ink-soft">Pirate</span>
      </div>
    </div>
  );
}
