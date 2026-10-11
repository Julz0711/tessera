'use client';

import { useEffect, useRef } from 'react';
import { reducedMotion } from '@/client/fx';
import { COMMODITIES, type Card, type DevCardType, type PartialHand, type ProgressCard, type Track } from '@/engine/types';
import { DEV_NAMES, DEV_TEXT, PROGRESS_NAMES } from '@/client/describe';
import { CARD_COLORS } from '@/client/palette';
import { PROGRESS_TEXT, TRACK_STYLE } from '@/client/progressText';
import { ArtShapes, FacetBackground, MiniArt, mix } from './cardArt';
import { BACK_BG, CardBackArt, CardTile, DEV_ART, PROGRESS_ART, TrackGlyph, type BackKind } from './cardArtLowPoly';

/** How much relief the card faces get: a gentle hint of the low-poly facets. */
const DEPTH = 0.45;

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
function CountBadge({ n, small, warn, low }: { n: number; small?: boolean; warn?: boolean; low?: boolean }) {
  const y = low ? 'bottom' : 'top';
  return (
    <span
      className={`hex-badge z-10 tabular ${warn ? 'hex-badge-warn' : ''} ${small ? `right-px ${y}-px w-4 text-[10px]` : `right-0.5 ${y}-0.5 w-5 text-[10px]`}`}
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
  tight,
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
  /** Tighter corners and the count in the bottom corner: the development and progress faces. */
  tight?: boolean;
  children: React.ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      // The drop shadow is a class (not an inline style) so Tailwind's rings compose with it.
      className={`relative flex shrink-0 flex-col items-center justify-center ${tight ? 'rounded-[5px]' : 'rounded-lg'} border-2 border-ink shadow-card ${CARD_BOX[size]} transition ${
        dim ? 'opacity-35' : ''
      } ${selected ? '-translate-y-2 ring-4 ring-amber' : glow ? 'ring-3 ring-amber' : ''} ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
      style={{ background: bg, color: ink }}
    >
      {children}
      {badge !== undefined && badge > 0 && <CountBadge n={badge} small={size === 'xs'} warn={warn} low={tight} />}
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

/** What a header prints when the full name would have to shrink below its size's floor to fit one line. */
const SHORT_NAMES: Record<string, string> = {
  'Victory Point': 'Victory',
  'Road Building': 'Roads',
  'Year of Plenty': 'Plenty',
  Constitution: 'Constit.',
  'Commercial Harbor': 'Harbor',
  'Master Merchant': 'Master',
  'Merchant Fleet': 'Fleet',
  'Resource Monopoly': 'Res. Mono',
  'Trade Monopoly': 'Trade Mono',
};
/** The header's usable width, its usual font size and the smallest it may shrink to (px), per size. */
const HEAD_FIT: Partial<Record<CardSize, { width: number; base: number; min: number }>> = {
  md: { width: 48, base: 7, min: 6 },
  xl: { width: 72, base: 8, min: 6.5 },
  lg: { width: 96, base: 10, min: 7.5 },
};
/** Uppercase black Figtree runs at about this many ems per letter. */
const EM_PER_CHAR = 0.7;

/** The header's one line: the full name at a size that fits, else its short form. */
function headerLabel(name: string, size: CardSize): { label: string; fontSize: number } | null {
  const fit = HEAD_FIT[size];
  if (!fit) return null;
  const sizeFor = (text: string) => Math.min(fit.base, fit.width / (text.length * EM_PER_CHAR));
  const full = sizeFor(name);
  const short = SHORT_NAMES[name];
  if (full >= fit.min || !short) return { label: name, fontSize: Math.max(full, fit.min) };
  return { label: short, fontSize: sizeFor(short) };
}

const INK = '#131a1d';

/**
 * The ink name header per size. The sizes themselves never change; the design scales with them. The
 * two tinier hand sizes leave the header off (their name would be under 5px) and give the tile the room;
 * tapping any card opens it at full size with its name. The rule text sits beside the card in its dialog,
 * so no size prints it.
 */
const HEAD: Record<CardSize, string | null> = {
  xs: null,
  sm: null,
  md: 'h-[11px] px-0.5',
  xl: 'h-3.5 px-[3px]',
  lg: 'h-[18px] px-1',
};
/** Room around the hex tile. */
const TILE_PAD: Record<CardSize, string> = { xs: 'p-px', sm: 'p-0.5', md: 'p-[3px]', xl: 'p-1', lg: 'p-1.5' };
/** The corner hex indices and the victory-point chip, only where they are big enough to read. */
const CORNER: Partial<Record<CardSize, { glyph: string; vp: string }>> = {
  xl: { glyph: 'top-[3px] h-2.5 w-[9px]', vp: 'top-[3px] rounded-[2px] border border-ink px-[2px] py-px text-[6px]' },
  lg: { glyph: 'top-1 h-3.5 w-3.25', vp: 'top-1 rounded-[2px] border-[1.5px] border-ink px-[3px] py-px text-[7.5px]' },
};
const CORNER_SIDE: Record<CardSize, [string, string]> = {
  xs: ['', ''],
  sm: ['', ''],
  md: ['', ''],
  xl: ['left-[3px]', 'right-[3px]'],
  lg: ['left-1', 'right-1'],
};

/** The shared "Emblem x Low-poly" face: ink name header, a paper hex tile with the illustration, track glyphs in the corners. */
function EmblemFace({ name, tint, art, vp, size }: { name: string; tint: 'dev' | Track; art: React.ReactNode; vp?: boolean; size: CardSize }) {
  const head = HEAD[size];
  const corner = CORNER[size];
  const [left, right] = CORNER_SIDE[size];
  // Always one line: the name shrinks to fit, or a long one prints its short form (the full name is the card's title).
  const line = headerLabel(name, size);
  return (
    <span className="pointer-events-none absolute inset-0 flex flex-col overflow-hidden rounded-[3px]">
      {head && line && (
        <span className={`grid shrink-0 place-items-center overflow-hidden whitespace-nowrap text-center font-black uppercase leading-none ${head}`} style={{ background: INK, color: '#fbfcfc', fontSize: line.fontSize }}>
          {line.label}
        </span>
      )}
      <span className={`relative min-h-0 flex-1 ${TILE_PAD[size]}`}>
        <CardTile tint={tint} simple={size === 'xs' || size === 'sm' || size === 'md'} className="block h-full w-full">
          {art}
        </CardTile>
        {corner && (
          <>
            <TrackGlyph track={tint} className={`absolute ${left} ${corner.glyph}`} />
            {vp ? (
              <span className={`absolute ${right} ${corner.vp} bg-amber font-black leading-none text-ink`}>1 VP</span>
            ) : (
              <TrackGlyph track={tint} className={`absolute ${right} ${corner.glyph}`} />
            )}
          </>
        )}
      </span>
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
    <CardShell bg={DEV_BG} ink="#fbfcfc" size={size} title={`${DEV_NAMES[type]}: ${DEV_TEXT[type]}`} onClick={onClick} glow={glow} badge={count} tight>
      <EmblemFace name={DEV_NAMES[type]} tint="dev" art={DEV_ART[type]} vp={type === 'victoryPoint'} size={size} />
      {fresh && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md border-2 border-ink bg-paper px-1 text-[10px] font-black uppercase leading-3 tracking-caps text-ink">
          New
        </span>
      )}
    </CardShell>
  );
}

/** A C&K progress card: the card is its track's colour, with an ink name header and the card's low-poly art on a hex tile. */
export function ProgressCardFace({ card, size = 'md', glow, onClick }: { card: ProgressCard; size?: CardSize; glow?: boolean; onClick?: () => void }) {
  const style = TRACK_STYLE[card.track];
  return (
    <CardShell
      bg={style.color}
      ink={style.ink}
      size={size}
      title={`${PROGRESS_NAMES[card.type]}: ${PROGRESS_TEXT[card.type]}`}
      onClick={onClick}
      glow={glow}
      tight
    >
      <EmblemFace name={PROGRESS_NAMES[card.type]} tint={card.track} art={PROGRESS_ART[card.type]} vp={card.type === 'printer' || card.type === 'constitution'} size={size} />
    </CardShell>
  );
}

/** The face-down card of the development deck or of a progress track, at one of the card sizes. */
export function CardBack({ kind, size = 'md', count }: { kind: BackKind; size?: CardSize; count?: number }) {
  return (
    <CardShell bg={BACK_BG[kind]} ink={INK} size={size} title={kind === 'dev' ? 'Development card' : `${TRACK_STYLE[kind].label} progress card`} badge={count} tight>
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3px]">
        <CardBackArt kind={kind} label={size === 'lg' || size === 'xl'} className="block h-full w-full" />
      </span>
    </CardShell>
  );
}
