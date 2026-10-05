'use client';

import { BrickWall, Ship, Sparkles, X } from 'lucide-react';
import { COSTS, type Card, type PartialHand } from '@/engine';
import { CARD_COLORS } from '@/client/palette';
import { CityGlyph, KnightGlyph, RoadGlyph, SettlementGlyph } from '@/components/ui/Glyphs';
import { MiniArt } from './cardArt';

/**
 * What a build costs: a chip per card kind with its count. Kinds the hand can't cover yet are
 * faded, so what's missing stands out.
 */
export function CostPips({ cost, hand }: { cost: PartialHand; hand?: PartialHand }) {
  const entries = (Object.entries(cost) as [Card, number][]).filter(([, n]) => n > 0);
  const label = entries.map(([c, n]) => `${n} ${CARD_COLORS[c].label}`).join(', ');
  return (
    <span className="flex items-center justify-center gap-1.5" aria-label={`Costs ${label}`} title={`Costs ${label}`}>
      {entries.map(([c, n]) => {
        const short = hand !== undefined && (hand[c] ?? 0) < n;
        return (
          <span
            key={c}
            className={`relative grid h-6 min-w-6 place-items-center rounded-md border border-black/40 ${short ? 'opacity-30 grayscale' : ''}`}
            style={{ background: CARD_COLORS[c].bg }}
          >
            <MiniArt card={c} size={18} />
            {n > 1 && (
              <span className="absolute -bottom-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full border border-paper bg-ink px-0.5 text-[10px] font-black leading-none text-paper">
                {n}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/**
 * A build's cost as small dots, one per card, for the dock's build buttons: always visible, so you
 * can see what you can afford at a glance. Cards the hand can't cover yet are greyed out.
 */
export function CostDots({ cost, hand }: { cost: PartialHand; hand: PartialHand }) {
  const entries = (Object.entries(cost) as [Card, number][]).filter(([, n]) => n > 0);
  const label = entries.map(([c, n]) => `${n} ${CARD_COLORS[c].label}`).join(', ');
  return (
    <span className="flex items-center gap-0.5" aria-label={`Costs ${label}`}>
      {entries.flatMap(([c, n]) =>
        Array.from({ length: n }, (_, i) => (
          // A card you're missing is the same pip left hollow, in its colour, rather than greyed out.
          <span
            key={`${c}${i}`}
            className="h-2.5 w-2 rounded-[2px]"
            style={
              (hand[c] ?? 0) > i
                ? { background: CARD_COLORS[c].bg, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.3)' }
                : { boxShadow: `inset 0 0 0 1.5px ${CARD_COLORS[c].bg}`, opacity: 0.8 }
            }
          />
        )),
      )}
    </span>
  );
}

/**
 * The building-costs sheet (touch screens, where there's no hover): every build with its cost and
 * what it scores, like the cheat sheet each player gets with the board game. A reference card, so
 * nothing on it fades with the hand (the hover bubble does that).
 */
export function BuildCostsCard({ ck, ships, onClose }: { ck: boolean; ships: boolean; onClose?: () => void }) {
  const rows: { label: string; icon: React.ReactNode; cost: PartialHand; vp?: string }[] = [
    { label: 'Road', icon: <RoadGlyph size={18} />, cost: COSTS.road, vp: '0 VP' },
    ...(ships ? [{ label: 'Ship', icon: <Ship size={18} />, cost: COSTS.ship, vp: '0 VP' }] : []),
    { label: 'Settlement', icon: <SettlementGlyph size={18} />, cost: COSTS.settlement, vp: '1 VP' },
    { label: 'City', icon: <CityGlyph size={18} />, cost: COSTS.city, vp: '2 VP' },
    ...(ck
      ? [
          { label: 'Knight', icon: <KnightGlyph size={18} />, cost: COSTS.knight },
          { label: 'Promote knight', icon: <KnightGlyph size={18} />, cost: COSTS.promote },
          { label: 'Activate knight', icon: <KnightGlyph size={18} />, cost: COSTS.activate },
          { label: 'City wall', icon: <BrickWall size={18} />, cost: COSTS.wall },
        ]
      : [{ label: 'Development card', icon: <Sparkles size={18} />, cost: COSTS.devCard, vp: '? VP' }]),
  ];
  return (
    <div className="relative w-full max-w-sm rounded-xl border-2 border-ink bg-paper p-3 text-ink shadow-lg" role={onClose ? 'dialog' : undefined} aria-label="Building costs">
      {onClose && (
        <button type="button" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full hover:bg-ink/10" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      )}
      <h2 className="display mb-2 text-center text-base font-black uppercase tracking-wide">Building costs</h2>
      <ul className="divide-y divide-ink/15">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 py-1.5">
            <span className="grid w-5 shrink-0 place-items-center">{r.icon}</span>
            <span className="min-w-0 flex-1 text-sm font-extrabold leading-tight">{r.label}</span>
            <CostPips cost={r.cost} />
            {r.vp !== undefined && <span className="w-9 shrink-0 text-right text-[11px] font-black text-ink/60">{r.vp}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-snug text-ink/70">
        A city replaces one of your settlements.{' '}
        {ck ? 'Each city wall lets you hold 2 more cards when a 7 is rolled.' : 'Play one development card a turn, not on the turn you buy it.'}
      </p>
    </div>
  );
}
