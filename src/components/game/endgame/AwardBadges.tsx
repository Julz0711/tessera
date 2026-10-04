import { Award as AwardIcon, Compass, Dices, Layers, Shield, Sprout, Swords, Target, VenetianMask, Waypoints } from 'lucide-react';
import type { ReactNode } from 'react';
import type { GameReport } from '@/engine/report';
import { reportAwards } from '@/client/reportAwards';
import { PLAYER_COLORS } from '@/shared/colors';
import { RoadGlyph } from '@/components/ui/Glyphs';

const ICONS: Record<string, ReactNode> = {
  'Luckiest dice': <Dices size={16} />,
  'Top producer': <Sprout size={16} />,
  'Trade master': <Waypoints size={16} />,
  'Robber baron': <VenetianMask size={16} />,
  'Favourite target': <Target size={16} />,
  'Master builder': <RoadGlyph size={16} />,
  Warlord: <Swords size={16} />,
  'Card shark': <Layers size={16} />,
  'Defender of Catan': <Shield size={16} />,
  Explorer: <Compass size={16} />,
};

/** The order awards are shown in: achievements first, the favourite target last. */
const PRIORITY = ['Top producer', 'Master builder', 'Luckiest dice', 'Warlord', 'Defender of Catan', 'Trade master', 'Robber baron', 'Card shark', 'Explorer', 'Favourite target'];

/**
 * Every award as a small tile: the award's icon ringed in the winner's colour, its title and the
 * winner; `detailed` (the stats view) adds the stat and its value.
 */
export function AwardBadges({ report, detailed = false, className = 'mt-5' }: { report: GameReport; detailed?: boolean; className?: string }) {
  const rank = (title: string) => (PRIORITY.includes(title) ? PRIORITY.indexOf(title) : PRIORITY.length);
  const awards = reportAwards(report).sort((a, b) => rank(a.title) - rank(b.title));
  if (!awards.length) return null;
  return (
    <section className={className} aria-label="Awards">
      <div className="mb-2.5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-ink/15" />
        <span className="label text-ink-faint">Awards</span>
        <span className="h-px flex-1 bg-ink/15" />
      </div>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {awards.map((a) => {
          const c = PLAYER_COLORS[report.players[a.seats[0]].color];
          const names = a.seats.map((s) => report.players[s].name).join(' & ');
          return (
            <li key={a.title} className="flex min-w-0 items-center gap-2 rounded-xl bg-ink/[0.05] py-1.5 pr-2 pl-1.5" title={`${a.stat}: ${a.value}`}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-ink" style={{ boxShadow: `inset 0 0 0 2.5px ${c.hex}` }}>
                {ICONS[a.title] ?? <AwardIcon size={16} />}
              </span>
              <span className="grid min-w-0 leading-tight">
                <b className="truncate text-[13px] font-extrabold">{a.title}</b>
                <span className="truncate text-xs text-ink-soft">{names}</span>
                {detailed && (
                  <span className="truncate text-[11px] text-ink-faint">
                    {a.stat}: <b className="tabular text-ink">{a.value}</b>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
