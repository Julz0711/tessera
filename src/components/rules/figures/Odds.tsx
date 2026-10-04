import { PIPS } from '@/engine';

const NUMS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

/** Number tokens over bars sized by how often the number is rolled. */
export function OddsFigure() {
  return (
    <div className="flex items-end justify-center gap-1 sm:gap-2" role="img" aria-label="Odds of each number">
      {NUMS.map((n) => {
        const hot = n === 6 || n === 8;
        const pips = PIPS[n];
        return (
          <div key={n} className="flex w-[28px] flex-col items-center gap-1 sm:w-9">
            <div
              className="w-full rounded-t-md border-2 border-ink"
              style={{ height: pips * 12 + 6, background: hot ? '#c2412d' : '#3e97ad' }}
              title={`${pips}/36`}
            />
            <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border-2 border-ink bg-[#f6eddb] leading-none">
              <span className="display text-[13px] font-black sm:text-base" style={{ color: hot ? '#c2412d' : '#1f1a14' }}>
                {n}
              </span>
              <span className="mt-0.5 flex gap-px">
                {Array.from({ length: pips }, (_, i) => (
                  <i key={i} className="block h-[3px] w-[3px] rounded-full" style={{ background: hot ? '#c2412d' : '#1f1a14' }} />
                ))}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
