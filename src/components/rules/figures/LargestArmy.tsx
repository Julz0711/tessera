import { DevCardFace } from '@/components/game/cards';
import { Arrow } from './art-basic';

/** Three played knights earn Largest Army: +2 VP. */
export function LargestArmyFigure() {
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <div className="flex">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i > 0 ? 'ml-2' : ''}>
            <DevCardFace type="knight" size="md" />
          </span>
        ))}
      </div>
      <Arrow size={22} />
      <span className="display grid h-14 w-20 place-items-center rounded-lg border-2 border-ink bg-[#e9c35a] text-xl font-black text-ink shadow">+2 VP</span>
    </div>
  );
}
