import { MiniBoard, type MiniHex, type MiniPieces } from './MiniBoard';
import { RoadGlyph } from '@/components/ui/Glyphs';

const HEXES: MiniHex[] = [
  { q: 0, r: 0, terrain: 'fields', token: 9 },
  { q: 1, r: 0, terrain: 'forest', token: 4 },
  { q: 0, r: 1, terrain: 'hills', token: 10 },
];

const PIECES: MiniPieces = {
  roads: [
    ...([[0, 5], [0, 0], [1, 5], [1, 0], [1, 1]] as [number, number][]).map((at) => ({ at, seat: 0 })),
    ...([[2, 2], [2, 3]] as [number, number][]).map((at) => ({ at, seat: 1 })),
  ],
};

/** Rulebook figure: a five-road chain next to a shorter rival, and the +2 VP card. */
export function LongestRoadFigure() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="min-w-[200px] flex-1" style={{ maxWidth: 300 }}>
        <MiniBoard hexes={HEXES} pieces={PIECES} height={190} label="A chain of five roads beats a chain of two" />
      </div>
      <div className="flex w-[104px] flex-col items-center gap-1 rounded-xl border-2 border-ink bg-paper px-2 py-3 shadow-[0_3px_0_0_#1f1a14]">
        <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-[#e8b04a] text-ink">
          <RoadGlyph size={28} strokeWidth={2.2} />
        </span>
        <span className="display text-xl font-black leading-none text-ink">+2 VP</span>
        <span className="label text-ink-soft">5+ roads</span>
      </div>
    </div>
  );
}
