import type { ReactNode } from 'react';
import type { Card } from '@/engine';
import { CARD_COLORS } from '@/client/palette';
import { MiniArt } from '@/components/game/cardArt';

const INK = '#1f1a14';

/** A pointy-top hex tile in a terrain colour. */
export function HexTile({ color, side, size = 44, children }: { color: string; side: string; size?: number; children?: ReactNode }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 50 55" aria-hidden className="shrink-0">
      <path d="M25 3 L47 15 V40 L25 52 L3 40 V15 Z" fill={side} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M25 3 L47 15 V37 L25 49 L3 37 V15 Z" fill={color} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {children}
    </svg>
  );
}

/** A right-pointing arrow in ink. */
export function Arrow({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 30 18" aria-hidden className={`shrink-0 ${className}`}>
      <path d="M3 9h22M18 3l7 6-7 6" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A small resource card: coloured face with the card's art. */
export function MiniCard({ card, w = 34, n }: { card: Card; w?: number; n?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-md border-2 border-ink"
      style={{ width: w, height: w * 1.3, background: CARD_COLORS[card].bg }}
      title={CARD_COLORS[card].label}
    >
      <MiniArt card={card} size={w * 0.8} />
      {n !== undefined && (
        <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-paper px-0.5 text-[11px] font-black leading-none text-ink">
          {n}
        </span>
      )}
    </span>
  );
}

/** A house in a player colour, drawn flat with an ink outline. */
export function House({ fill, dark, size = 30 }: { fill: string; dark: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden className="shrink-0">
      <path d="M4 14 15 4l11 10v12H4Z" fill={fill} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M4 14 15 4l11 10Z" fill={dark} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="12" y="19" width="6" height="7" fill={INK} opacity=".55" />
    </svg>
  );
}

/** The board's harbor ship: hull, mast and a sail showing the rate; `kind` puts a resource dot on it. */
export function HarborShip({ rate, kind, size = 64 }: { rate: string; kind?: Card; size?: number }) {
  return (
    <svg width={size} height={size * 0.95} viewBox="-30 -42 60 68" aria-hidden className="shrink-0">
      <path d="M-24 8h48l-9 13h-30Z" fill="#8a6139" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="-1.5" y="-38" width="3" height="47" fill="#5a3d22" />
      <path d="M-19-34h36q-4 16 0 34h-36q4-18 0-34Z" fill="#f6eddb" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {kind === undefined ? (
        <text y="-20" textAnchor="middle" fontSize="14" fontWeight="900" fill={INK}>
          ?
        </text>
      ) : (
        <circle cy="-24" r="6.5" fill={CARD_COLORS[kind].bg} stroke={INK} strokeWidth="1.5" />
      )}
      <text y="-5" textAnchor="middle" className="display" fontSize="13" fontWeight="900" fill={INK}>
        {rate}
      </text>
    </svg>
  );
}
