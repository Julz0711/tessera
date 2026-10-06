const DICE_TOTALS = Array.from({ length: 11 }, (_, i) => i + 2); // 2..12

/** Ways two dice make `t` (out of 36); unlike the token pips, this counts 7 too. */
const ways = (t: number) => 6 - Math.abs(7 - t);

/** A dice-roll histogram for totals 2–12, with a dashed marker at each total's expected count. */
export function DiceHistogram({ dice, compact = false, expectedCounts }: { dice: number[]; compact?: boolean; expectedCounts?: number[] | null }) {
  const totalRolls = dice.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...DICE_TOTALS.map((t) => Math.max(dice[t] ?? 0, expectedCounts === null ? 0 : expectedCounts?.[t] ?? totalRolls * ways(t) / 36)));
  return (
    <div className={`paper-flat ${compact ? 'p-2' : 'p-3'}`}>
      <div className={`${compact ? 'mb-1' : 'mb-2'} flex items-baseline justify-between`}>
        <span className="label">Dice rolls</span>
        <span className="text-xs font-bold text-ink-faint">{totalRolls} total</span>
      </div>
      <div className={`grid grid-cols-11 items-end ${compact ? 'gap-0.5' : 'gap-1 sm:gap-1.5'}`}>
        {DICE_TOTALS.map((t) => {
          const count = dice[t] ?? 0;
          const expected = expectedCounts?.[t] ?? (totalRolls * ways(t)) / 36;
          return (
            <div key={t} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-black tabular">{count}</span>
              <div className={`relative flex w-full items-end justify-center rounded-sm bg-ink/6 ${compact ? 'h-12' : 'h-20 sm:h-24'}`}>
                {expectedCounts !== null && <span
                  className="absolute inset-x-0.5 border-t-2 border-dashed border-terracotta/70"
                  style={{ bottom: `${Math.min(100, (expected / maxCount) * 100)}%` }}
                  title={`Expected: about ${expected.toFixed(1)} rolls of ${t}`}
                />}
                <div className="w-full rounded-t-sm bg-sea-600" style={{ height: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="text-[10px] font-bold text-ink-faint">{t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
