import { CityGlyph } from '@/components/ui/Glyphs';
import { Arrow, LongShip, Swords } from './art-ck';

const STEPS = 7;

/** Rulebook figure: the ship's seven steps to the island, then cities against active knights. */
export function BarbariansFigure() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-end justify-center gap-1">
        <LongShip size={44} />
        {Array.from({ length: STEPS }, (_, i) => (
          <span
            key={i}
            className="display grid h-6 w-6 place-items-center rounded-md border-2 border-ink text-[10px] font-black text-ink"
            style={{ background: i === STEPS - 1 ? '#f2994a' : '#c9a273' }}
          >
            {i + 1}
          </span>
        ))}
        <span className="mb-0.5 ml-1 grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-[#8fe0a8] text-ink">
          <CityGlyph size={20} />
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1 rounded-lg border-2 border-ink bg-paper px-2 py-1">
          <LongShip size={26} dark />
          <span className="display text-lg font-black text-ink">3</span>
          <span className="flex">
            {[0, 1, 2].map((i) => (
              <CityGlyph key={i} size={18} className="text-[#b3261e]" />
            ))}
          </span>
        </div>
        <span className="display text-2xl font-black text-ink" aria-label="against">
          vs
        </span>
        <div className="flex items-center gap-1 rounded-lg border-2 border-ink bg-paper px-2 py-1">
          <Swords size={26} />
          <span className="display text-lg font-black text-ink">1+2+3</span>
        </div>
        <span className="display flex items-center gap-1.5 rounded-lg border-2 border-ink bg-[#8fe0a8] px-2 py-1 text-sm font-black text-ink">
          <Arrow size={18} />
          Defended
        </span>
      </div>
    </div>
  );
}
