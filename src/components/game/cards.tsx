'use client';

import {
  Anchor,
  Anvil,
  Bomb,
  BrickWall,
  Church,
  Construction,
  Droplets,
  Eye,
  FlaskConical,
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
import { useEffect, useRef } from 'react';
import { reducedMotion } from '@/client/fx';
import { COMMODITIES, type Card, type DevCardType, type PartialHand, type ProgressCard, type ProgressCardType } from '@/engine/types';
import { DEV_NAMES, DEV_TEXT, PROGRESS_NAMES } from '@/client/describe';
import { CARD_COLORS } from '@/client/palette';
import { PROGRESS_TEXT, TRACK_STYLE } from '@/client/progressText';
import { RoadGlyph } from '@/components/ui/Glyphs';
import { ArtShapes, FacetBackground, Medallion, MiniArt, mix } from './cardArt';

/** How much relief the card faces get: a gentle hint of the low-poly facets. */
const DEPTH = 0.45;

type Icon = (p: { size?: number; strokeWidth?: number; className?: string }) => React.ReactNode;

/** Small inline chip (log lines, trade summaries): the card's art on its colour, with a count. */
export function CardChip({ card, n }: { card: Card; n?: number }) {
  const c = CARD_COLORS[card];
  return (
    <span
      // Centred on the line, not on a baseline: an inline-flex box takes its baseline from its
      // content, so a chip with a count ("2") sat higher than one with just the art.
      className="mx-0.5 inline-flex items-center gap-px rounded-md align-middle border border-black/30 px-0.5 text-[11px] font-black leading-4.5"
      style={{ background: c.bg, color: c.ink }}
      title={c.label}
    >
      {n !== undefined && n > 1 && <span className="pl-0.5">{n}</span>}
      <MiniArt card={card} size={17} />
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

export type CardSize = 'xs' | 'sm' | 'md' | 'xl' | 'lg';

const CARD_BOX: Record<CardSize, string> = {
  xs: 'h-11 w-8',
  sm: 'h-14 w-10',
  md: 'h-18 w-13',
  /** The hand in its own corner on wide screens. */
  xl: 'h-27.5 w-19.5',
  lg: 'h-36 w-26',
};

/** The count, tucked inside the card's top-right corner (it used to hang over the edge). */
function CountBadge({ n, small, warn }: { n: number; small?: boolean; warn?: boolean }) {
  return (
    <span
      className={`hex-badge z-10 tabular ${warn ? 'hex-badge-warn' : ''} ${small ? 'right-px top-px w-4 text-[10px]' : 'right-0.5 top-0.5 w-5 text-[10px]'}`}
    >
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
  warn,
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
  /** Red count badge (the hand is over the discard limit). */
  warn?: boolean;
  children: React.ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      // The drop shadow is a class (not an inline style) so Tailwind's rings compose with it.
      className={`relative flex shrink-0 flex-col items-center justify-center rounded-lg border-2 border-ink shadow-card ${CARD_BOX[size]} transition ${
        dim ? 'opacity-35' : ''
      } ${selected ? '-translate-y-2 ring-4 ring-amber' : glow ? 'ring-3 ring-amber' : ''} ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
      style={{ background: bg, color: ink }}
    >
      {children}
      {badge !== undefined && badge > 0 && <CountBadge n={badge} small={size === 'xs'} warn={warn} />}
    </Tag>
  );
}

/** The printed face of a resource or commodity card: faceted backdrop, low-poly art, name ribbon. */
function ResourceFace({ card, label }: { card: Card; label: boolean }) {
  const c = CARD_COLORS[card];
  const commodity = (COMMODITIES as readonly Card[]).includes(card);
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4.5px]">
      <svg className="h-full w-full" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
        <FacetBackground color={c.bg} seed={card} depth={DEPTH} />
        {/* commodities are finished goods: a fine inner frame sets them apart from raw resources */}
        {commodity && <rect x="5" y="5" width="90" height="130" rx="5" fill="none" stroke={mix(c.bg, '#fffaf0', 0.75)} strokeWidth="1.6" />}
        <g transform={label ? 'translate(-3 6) scale(1.06)' : 'translate(-6 8.4) scale(1.12)'}>
          <ArtShapes card={card} />
        </g>
        {label && (
          <g>
            <polygon points="7,111 93,111 89,120.5 93,130 7,130 11,120.5" fill={mix(c.bg, '#000000', 0.45)} />
            <text x="50" y="125" textAnchor="middle" fontSize="12.5" fontWeight="900" letterSpacing="1.2" fill="#fff7ea">
              {c.label.toUpperCase()}
            </text>
          </g>
        )}
      </svg>
    </span>
  );
}

/**
 * A resource or commodity card: low-poly art on a faceted face in the card's colour, with the name
 * on a ribbon. Small cards (trade window, pickers) leave the name off.
 */
export function ResourceCard({
  card,
  count,
  size = 'md',
  onClick,
  selected,
  dim,
  // The name is drawn at an eighth of the card's width: on the phone sizes (xs to md) that's under
  // 7px, so those cards go by colour and art alone, like the development cards' ribbon.
  label = size === 'lg' || size === 'xl',
  warn,
}: {
  card: Card;
  /** Shown as a badge when above 0; a picker passes 0 for a plain card. */
  count: number;
  size?: CardSize;
  onClick?: () => void;
  selected?: boolean;
  dim?: boolean;
  label?: boolean;
  warn?: boolean;
}) {
  const c = CARD_COLORS[card];
  return (
    <CardShell
      bg={c.bg}
      ink={c.ink}
      size={size}
      title={count > 0 ? `${c.label}: ${count}` : c.label}
      onClick={onClick}
      selected={selected}
      dim={dim}
      badge={count}
      warn={warn}
    >
      <ResourceFace card={card} label={label} />
    </CardShell>
  );
}

/** The "?" card: an open trade offer asks the others what they'd give instead of naming it. */
export function AskCard({ size = 'md', onClick, selected }: { size?: CardSize; onClick?: () => void; selected?: boolean }) {
  return (
    <CardShell bg="#0f2f3b" ink="#ffffff" size={size} title="Anything: ask what they'd give" onClick={onClick} selected={selected}>
      <span aria-hidden className={`font-black leading-none ${size === 'xs' ? 'text-lg' : size === 'sm' ? 'text-2xl' : 'text-4xl'}`}>
        ?
      </span>
    </CardShell>
  );
}

/** The most extra cards a stack shows behind its top card. */
export const MAX_SLIVERS = 3;

/** How far each extra card of a stack peeks out, in px. */
export const stackStep = (size: CardSize) => (size === 'xl' ? 9 : size === 'md' || size === 'lg' ? 7 : 4);

/**
 * Cards of one kind, fanned like a real stack: a sliver per extra card (up to MAX_SLIVERS), plus a count.
 * `held` is only passed for the hand: it marks the stack as where flying cards land.
 */
export function CardStack({
  card,
  count,
  held,
  size = 'md',
  warn,
  fan = true,
  step: stepOverride,
  tuck = 0,
  onClick,
}: {
  card: Card;
  count: number;
  held?: number;
  size?: CardSize;
  warn?: boolean;
  /** Off: one card with its count, no slivers behind it (a full hand short of room). */
  fan?: boolean;
  /** How far each extra card peeks out, in px, when the hand is short of room (default: `stackStep`). */
  step?: number;
  /** How far the extra cards may reach into the gap before the stack, in px. */
  tuck?: number;
  onClick?: () => void;
}) {
  const c = CARD_COLORS[card];
  const extra = fan ? Math.min(count - 1, MAX_SLIVERS) : 0;
  const step = stepOverride ?? stackStep(size);
  const ref = useRef<HTMLDivElement>(null);
  const before = useRef(held);
  // More cards of this kind came in (not just back from the trade panel): the stack hops as the
  // flying card lands on it (see FlyLayer; cards from the board or the bank land about 1 s after the event).
  useEffect(() => {
    const gained = held !== undefined && before.current !== undefined && held > before.current;
    before.current = held;
    const el = ref.current;
    if (!gained || !el || reducedMotion()) return;
    el.animate(
      [{ transform: 'none' }, { transform: 'translateY(-10px) scale(1.08)', offset: 0.4 }, { transform: 'none' }],
      { duration: 420, delay: 1000, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' },
    );
  }, [held]);
  return (
    <div ref={ref} className="relative flex shrink-0" style={{ paddingLeft: extra * step, marginLeft: -Math.min(tuck, extra * step) }} data-hand-card={held !== undefined ? card : undefined}>
      {Array.from({ length: extra }, (_, i) => (
        <span
          key={i}
          aria-hidden
          // The copies behind are the card itself, a shade deeper the further back, with one shadow
          // under the whole stack (each its own shadow muddied the edges into dark stripes).
          className={`absolute top-0 rounded-lg border-2 border-ink ${i === 0 ? 'shadow-card' : ''} ${CARD_BOX[size]}`}
          style={{ left: i * step, background: mix(c.bg, '#000000', 0.04 * (extra - i)) }}
        />
      ))}
      <ResourceCard card={card} count={count} size={size} warn={warn} onClick={onClick} />
    </div>
  );
}

/**
 * Name ribbon for development and progress cards (their names can take two lines). On the phone's
 * hand card (md) it runs edge to edge in 9px bold, the smallest that still reads, breaking a long
 * word with a hyphen ("Consti-tution"). The two tinier sizes, only used for a crowded hand, leave it
 * off; tapping any card opens it at full size with its name.
 */
function Ribbon({ color, size, children }: { color: string; size: CardSize; children: React.ReactNode }) {
  if (size === 'xs' || size === 'sm') return null;
  return (
    <span
      lang="en"
      className={`pointer-events-none absolute grid place-items-center text-center leading-[1.08] ${
        size === 'lg'
          ? 'inset-x-[5%] bottom-[5%] min-h-8 px-[11%] py-1 text-[11px] font-black'
          : size === 'xl'
            ? 'inset-x-[5%] bottom-[5%] min-h-[17%] px-[7%] py-[3px] text-[10px] font-black'
            : 'inset-x-px bottom-[4%] min-h-[17%] px-[5%] py-[2px] text-[9px] font-bold tracking-[-0.01em] hyphens-auto [overflow-wrap:anywhere]'
      }`}
      style={{
        background: mix(color, '#000000', 0.45),
        color: '#fff7ea',
        clipPath: 'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)',
      }}
    >
      {children}
    </span>
  );
}

/** Development cards share the sea-teal face; each has its own low-poly art. */
const DEV_BG = '#0f2f3b';

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
  return (
    <CardShell bg={DEV_BG} ink="#f6eddb" size={size} title={`${DEV_NAMES[type]}: ${DEV_TEXT[type]}`} onClick={onClick} glow={glow} badge={count}>
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4.5px]">
        <svg className="h-full w-full" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
          <FacetBackground color={DEV_BG} seed={type} depth={DEPTH} />
          <g transform="translate(-2 1) scale(1.04)">
            <ArtShapes card={type} />
          </g>
        </svg>
      </span>
      <Ribbon color={DEV_BG} size={size}>
        {DEV_NAMES[type]}
      </Ribbon>
      {fresh && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md border-2 border-ink bg-paper px-1 text-[10px] font-black uppercase leading-3 tracking-caps text-ink">
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

/** A C&K progress card: a faceted face in its track's colour, the card's symbol on a hexagon token. */
export function ProgressCardFace({ card, size = 'md', glow, onClick }: { card: ProgressCard; size?: CardSize; glow?: boolean; onClick?: () => void }) {
  const style = TRACK_STYLE[card.track];
  const Icon = PROGRESS_ICON[card.type];
  return (
    <CardShell
      bg={style.color}
      ink={style.ink}
      size={size}
      title={`${PROGRESS_NAMES[card.type]}: ${PROGRESS_TEXT[card.type]}`}
      onClick={onClick}
      glow={glow}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4.5px]">
        <svg className="h-full w-full" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
          <FacetBackground color={style.color} seed={card.type} depth={DEPTH} />
          <Medallion cx={50} cy={50} r={31} />
        </svg>
      </span>
      <span className="pointer-events-none absolute left-1/2 top-[35.7%] -translate-x-1/2 -translate-y-1/2" style={{ color: mix(style.color, '#131a1d', 0.55) }}>
        <Icon size={size === 'lg' ? 40 : size === 'xl' ? 28 : 20} strokeWidth={2.4} />
      </span>
      <Ribbon color={style.color} size={size}>
        {PROGRESS_NAMES[card.type]}
      </Ribbon>
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
