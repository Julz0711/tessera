import { PLAYER_COLORS } from '@/shared/colors';
import { Arrow, House } from './art-basic';

const SEATS = ['red', 'blue', 'orange', 'green'] as const;

function Round({ order, label }: { order: number[]; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        {order.map((p, i) => {
          const c = PLAYER_COLORS[SEATS[p - 1]];
          return (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && <Arrow size={14} />}
              <span className="flex flex-col items-center">
                <House fill={c.hex} dark={c.dark} size={34} />
                <span className="display text-sm font-black leading-none text-ink">{p}</span>
              </span>
            </span>
          );
        })}
      </div>
      <span className="label text-ink-soft">{label}</span>
    </div>
  );
}

/** Snake order: 1-2-3-4, then 4-3-2-1; the second settlement pays out. */
export function SetupFigure() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-3">
      <Round order={[1, 2, 3, 4]} label="First" />
      <Round order={[4, 3, 2, 1]} label="Second + resources" />
    </div>
  );
}
