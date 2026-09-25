'use client';

import {
  Anchor,
  Anvil,
  Award,
  Bomb,
  BrickWall,
  Church,
  Construction,
  Droplets,
  Eye,
  FlaskConical,
  Gift,
  HandCoins,
  Handshake,
  Heart,
  Lightbulb,
  Magnet,
  Minus,
  Pickaxe,
  Pill,
  Plus,
  Printer,
  Scale,
  ScrollText,
  Ship,
  Store,
  Swords,
  UserMinus,
  VenetianMask,
} from 'lucide-react';
import { COMMODITIES, type Card, type DevCardType, type PartialHand, type ProgressCard, type ProgressCardType } from '@/engine/types';
import { DEV_NAMES, DEV_TEXT, PROGRESS_NAMES } from '@/client/describe';
import { CARD_COLORS, shade } from '@/client/palette';
import { PROGRESS_TEXT, TRACK_STYLE } from '@/client/progressText';
import { CARD_GLYPH, KnightGlyph, RoadGlyph } from '@/components/ui/Glyphs';

type Icon = (p: { size?: number; strokeWidth?: number; className?: string }) => React.ReactNode;

/** Small inline chip (log lines, trade summaries). */
export function CardChip({ card, n }: { card: Card; n?: number }) {
  const c = CARD_COLORS[card];
  const Glyph = CARD_GLYPH[card];
  return (
    <span
      className="mx-0.5 inline-flex translate-y-0.5 items-center gap-0.5 rounded-md border border-black/30 px-1 text-[11px] font-black leading-4.5"
      style={{ background: c.bg, color: c.ink }}
      title={c.label}
    >
      {n !== undefined && n > 1 && <span>{n}</span>}
      <Glyph size={13} strokeWidth={2.2} />
    </span>
  );
}

export function CardList({ cards }: { cards: PartialHand }) {
  const entries = Object.entries(cards).filter(([, n]) => (n ?? 0) > 0) as [Card, number][];
  if (!entries.length) return <span className="text-ink-faint">nothing</span>;
  return (
    <span>
      {entries.map(([c, n]) => (
        <CardChip key={c} card={c} n={n} />
      ))}
    </span>
  );
}

// ── Printed cards ────────────────────────────────────────────────────────────

export type CardSize = 'sm' | 'md' | 'lg';

const CARD_BOX: Record<CardSize, string> = {
  sm: 'h-14 w-10',
  md: 'h-18 w-13 sm:h-20 sm:w-14',
  lg: 'h-36 w-26',
};
const GLYPH_SIZE: Record<CardSize, number> = { sm: 20, md: 26, lg: 48 };

function CountBadge({ n }: { n: number }) {
  return (
    <span className="absolute -right-2 -top-2 z-10 grid h-6 min-w-6 place-items-center rounded-full border-2 border-ink bg-paper px-1 text-xs font-black text-ink tabular">
      {n}
    </span>
  );
}

/** The card frame shared by resource, development and progress cards. */
function CardShell({
  bg,
  ink,
  size = 'md',
  title,
  onClick,
  selected,
  dim,
  glow,
  badge,
  children,
}: {
  bg: string;
  ink: string;
  size?: CardSize;
  title?: string;
  onClick?: () => void;
  selected?: boolean;
  dim?: boolean;
  /** Playable right now. */
  glow?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      // The drop shadow is a class (not an inline style) so Tailwind's rings compose with it.
      className={`relative flex shrink-0 flex-col items-center justify-center rounded-lg border-2 border-ink shadow-token ${CARD_BOX[size]} transition ${
        dim ? 'opacity-35' : ''
      } ${selected ? '-translate-y-2 ring-4 ring-amber' : glow ? 'ring-3 ring-amber' : ''} ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
      style={{ background: bg, color: ink }}
    >
      {/* printed inner frame */}
      <span className="pointer-events-none absolute inset-0.75 rounded-[5px] border border-current opacity-20" />
      {children}
      {badge !== undefined && badge > 0 && <CountBadge n={badge} />}
    </Tag>
  );
}

function CardName({ size, children }: { size: CardSize; children: React.ReactNode }) {
  return (
    <span className={`mt-1 px-1 text-center font-extrabold leading-[1.05] ${size === 'lg' ? 'text-sm' : 'text-[8px] sm:text-[8.5px]'}`}>{children}</span>
  );
}

const svgTile = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`)}")`;

/** A faint printed pattern per card, drawn in the card's ink color: a hint of the material. */
const CARD_PATTERN: Record<Card, (ink: string) => string> = {
  brick: (c) => svgTile(18, 12, `<path d='M0 .5h18M0 6.5h18M4.5 .5v6M13.5 6.5v6' stroke='${c}' fill='none'/>`),
  lumber: (c) => svgTile(12, 24, `<path d='M3 0q3 6 0 12t0 12M9 0q-2.5 7 0 12t0 12' stroke='${c}' fill='none'/>`),
  wool: (c) => svgTile(12, 12, `<circle cx='3' cy='3' r='1.8' fill='${c}'/><circle cx='9' cy='9' r='1.8' fill='${c}'/>`),
  grain: (c) => svgTile(8, 8, `<path d='M-1 9L9 -1M-3 3L3 -3M5 11L11 5' stroke='${c}'/>`),
  ore: (c) => svgTile(14, 12, `<path d='M0 12L7 1l7 11' stroke='${c}' fill='none'/>`),
  paper: (c) => svgTile(10, 7, `<path d='M0 6.5h10' stroke='${c}'/>`),
  cloth: (c) => svgTile(8, 8, `<path d='M0 0l8 8M8 0L0 8' stroke='${c}'/>`),
  coin: (c) => svgTile(14, 14, `<circle cx='7' cy='7' r='4' stroke='${c}' fill='none'/>`),
};

/** Card face: lit from the top-left, a shade deeper at the bottom. */
const cardBackground = (bg: string) => `linear-gradient(155deg, ${shade(bg, 0.28)} 0%, ${bg} 48%, ${shade(bg, -0.22)} 100%)`;

const MEDALLION: Record<CardSize, { box: number; glyph: number }> = {
  sm: { box: 28, glyph: 17 },
  md: { box: 34, glyph: 21 },
  lg: { box: 66, glyph: 40 },
};

/**
 * A resource or commodity card: a gradient face with a material pattern, the icon in a cream
 * medallion, and the name along the bottom. Small cards (trade window, pickers) leave the name off.
 */
export function ResourceCard({
  card,
  count,
  size = 'md',
  onClick,
  selected,
  dim,
  label = size !== 'sm',
}: {
  card: Card;
  /** Shown as a badge when above 0; a picker passes 0 for a plain card. */
  count: number;
  size?: CardSize;
  onClick?: () => void;
  selected?: boolean;
  dim?: boolean;
  label?: boolean;
}) {
  const c = CARD_COLORS[card];
  const Glyph = CARD_GLYPH[card];
  const m = MEDALLION[size];
  const commodity = (COMMODITIES as readonly Card[]).includes(card);
  return (
    <CardShell
      bg={cardBackground(c.bg)}
      ink={c.ink}
      size={size}
      title={count > 0 ? `${c.label}: ${count}` : c.label}
      onClick={onClick}
      selected={selected}
      dim={dim}
      badge={count}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[6px] opacity-[0.16]" style={{ backgroundImage: CARD_PATTERN[card](c.ink) }} />
      {/* commodities carry a little corner ribbon so they read apart from resources at a glance */}
      {commodity && (
        <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-3 w-3 overflow-hidden rounded-tl-[6px]">
          <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rotate-45" style={{ background: c.ink, opacity: 0.55 }} />
        </span>
      )}
      <span
        className={`relative grid place-items-center rounded-full border-2 ${label ? '-mt-2' : ''}`}
        style={{
          width: m.box,
          height: m.box,
          background: 'radial-gradient(circle at 35% 30%, #fffdf6 0%, #f6eddb 60%, #e3d3b0 100%)',
          borderColor: c.deep,
          color: c.deep,
          boxShadow: `0 1.5px 0 0 ${shade(c.bg, -0.45)}`,
        }}
      >
        <Glyph size={m.glyph} strokeWidth={2.2} />
      </span>
      {label && (
        <span
          className={`absolute inset-x-0 text-center font-black uppercase leading-none ${size === 'lg' ? 'bottom-2.5 text-xs tracking-[0.14em]' : 'bottom-1.5 text-[7px] tracking-[0.12em]'}`}
        >
          {c.label}
        </span>
      )}
    </CardShell>
  );
}

/** Held cards of one kind, fanned like a real stack: a sliver per extra card (up to 4), plus a count. */
export function CardStack({ card, count, onClick }: { card: Card; count: number; onClick?: () => void }) {
  const c = CARD_COLORS[card];
  const extra = Math.min(count - 1, 4);
  const step = 7;
  return (
    <div className="relative flex shrink-0" style={{ paddingLeft: extra * step }}>
      {Array.from({ length: extra }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={`absolute top-0 rounded-lg border-2 border-ink shadow-token ${CARD_BOX.md}`}
          style={{ left: i * step, background: cardBackground(c.bg), filter: `brightness(${0.78 + i * 0.05})` }}
        />
      ))}
      <ResourceCard card={card} count={count} onClick={onClick} />
    </div>
  );
}

const DEV_ICON: Record<DevCardType, Icon> = {
  knight: KnightGlyph,
  roadBuilding: RoadGlyph,
  yearOfPlenty: Gift,
  monopoly: Magnet,
  victoryPoint: Award,
};

/** A development card (classic), grouped by type with a count. */
export function DevCardFace({
  type,
  count,
  size = 'md',
  fresh,
  glow,
  onClick,
}: {
  type: DevCardType;
  count?: number;
  size?: CardSize;
  /** Bought this turn, so not playable yet. */
  fresh?: boolean;
  glow?: boolean;
  onClick?: () => void;
}) {
  const Icon = DEV_ICON[type];
  const vp = type === 'victoryPoint';
  return (
    <CardShell
      bg={vp ? '#f2b33d' : '#1d5a6b'}
      ink={vp ? '#1f1a14' : '#f6eddb'}
      size={size}
      title={`${DEV_NAMES[type]} — ${DEV_TEXT[type]}`}
      onClick={onClick}
      glow={glow}
      badge={count}
    >
      <Icon size={GLYPH_SIZE[size] - 2} strokeWidth={2} />
      <CardName size={size}>{DEV_NAMES[type]}</CardName>
      {fresh && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded border-2 border-ink bg-paper px-1 text-[8px] font-black uppercase leading-3 text-ink">
          New
        </span>
      )}
    </CardShell>
  );
}

const PROGRESS_ICON: Record<ProgressCardType, Icon> = {
  // science
  alchemist: FlaskConical,
  crane: Construction,
  engineer: BrickWall,
  inventor: Lightbulb,
  irrigation: Droplets,
  medicine: Pill,
  mining: Pickaxe,
  printer: Printer,
  roadBuilding: RoadGlyph,
  smith: Anvil,
  // politics
  bishop: Church,
  constitution: ScrollText,
  deserter: UserMinus,
  diplomat: Handshake,
  intrigue: VenetianMask,
  saboteur: Bomb,
  spy: Eye,
  warlord: Swords,
  wedding: Heart,
  // trade
  commercialHarbor: Anchor,
  masterMerchant: HandCoins,
  merchant: Store,
  merchantFleet: Ship,
  resourceMonopoly: Magnet,
  tradeMonopoly: Scale,
};

/** A C&K progress card, in its track's colour with the track's commodity in the corner. */
export function ProgressCardFace({ card, size = 'md', glow, onClick }: { card: ProgressCard; size?: CardSize; glow?: boolean; onClick?: () => void }) {
  const style = TRACK_STYLE[card.track];
  const Icon = PROGRESS_ICON[card.type];
  const Mark = CARD_GLYPH[style.commodity];
  return (
    <CardShell bg={style.color} ink={style.ink} size={size} title={`${PROGRESS_NAMES[card.type]} — ${PROGRESS_TEXT[card.type]}`} onClick={onClick} glow={glow}>
      <span className={`absolute opacity-60 ${size === 'lg' ? 'left-2 top-2' : 'left-1 top-1'}`}>
        <Mark size={size === 'lg' ? 16 : 10} strokeWidth={2.4} />
      </span>
      <Icon size={GLYPH_SIZE[size] - 2} strokeWidth={2} />
      <CardName size={size}>{PROGRESS_NAMES[card.type]}</CardName>
    </CardShell>
  );
}

/** +/- picker for choosing how many of each card (discards, trades). */
export function CardPicker({
  cards,
  value,
  onChange,
  max,
  limitTotal,
}: {
  cards: readonly Card[];
  value: PartialHand;
  onChange: (v: PartialHand) => void;
  /** Per-card maximum (e.g. what you hold); undefined = unlimited. */
  max?: PartialHand;
  limitTotal?: number;
}) {
  const total = cards.reduce((n, c) => n + (value[c] ?? 0), 0);
  const set = (c: Card, n: number) => onChange({ ...value, [c]: Math.max(0, n) });
  return (
    <div className="flex flex-wrap gap-2">
      {cards.map((c) => {
        const n = value[c] ?? 0;
        const cap = max ? (max[c] ?? 0) : Infinity;
        const canAdd = n < cap && (limitTotal === undefined || total < limitTotal);
        return (
          <div key={c} className="flex flex-col items-center gap-1">
            <ResourceCard card={c} count={n} size="sm" onClick={canAdd ? () => set(c, n + 1) : undefined} dim={cap === 0} />
            <div className="flex items-center gap-1">
              <button type="button" className="btn h-6 w-6 p-0" disabled={n === 0} onClick={() => set(c, n - 1)} aria-label={`Less ${c}`}>
                <Minus size={12} />
              </button>
              <button type="button" className="btn h-6 w-6 p-0" disabled={!canAdd} onClick={() => set(c, n + 1)} aria-label={`More ${c}`}>
                <Plus size={12} />
              </button>
            </div>
            {max && <span className="text-[10px] font-bold text-ink-faint">of {cap}</span>}
          </div>
        );
      })}
    </div>
  );
}
