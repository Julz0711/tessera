import type { SVGProps } from 'react';
import type { Card } from '@/engine/types';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20, props: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export function BrickGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <rect x="3" y="5" width="8" height="4.5" rx="0.8" />
      <rect x="13" y="5" width="8" height="4.5" rx="0.8" />
      <rect x="7.5" y="10.8" width="9" height="4.5" rx="0.8" />
      <rect x="3" y="16.5" width="8" height="4.5" rx="0.8" />
      <rect x="13" y="16.5" width="8" height="4.5" rx="0.8" />
    </svg>
  );
}

export function LumberGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <path d="M5 9h13" />
      <path d="M5 15h13" />
      <ellipse cx="5" cy="12" rx="2" ry="3" />
      <ellipse cx="18" cy="12" rx="2" ry="3" />
      <circle cx="18" cy="12" r="0.8" fill="currentColor" />
      <path d="M9 7.5 7.5 5M13 7.5l1.5-2.5" />
    </svg>
  );
}

export function WoolGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <path d="M6.5 16.5c-2 0-3.5-1.4-3.5-3.2 0-1.6 1.2-2.9 2.8-3.2C6.2 8.2 7.9 7 9.8 7c1.2 0 2.3.5 3 1.3.6-.4 1.3-.6 2.1-.6 2 0 3.6 1.5 3.7 3.4 1.5.4 2.4 1.6 2.4 3 0 1.9-1.6 3.4-3.6 3.4Z" />
      <path d="M8 16.5V20M16 16.5V20" />
    </svg>
  );
}

export function GrainGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <path d="M12 21V6" />
      <path d="M12 8c-2-.4-3.2-1.8-3.3-3.8 2 .3 3.2 1.6 3.3 3.8Zm0 0c2-.4 3.2-1.8 3.3-3.8-2 .3-3.2 1.6-3.3 3.8Z" />
      <path d="M12 12.5c-2-.4-3.2-1.8-3.3-3.8 2 .3 3.2 1.6 3.3 3.8Zm0 0c2-.4 3.2-1.8 3.3-3.8-2 .3-3.2 1.6-3.3 3.8Z" />
      <path d="M12 17c-2-.4-3.2-1.8-3.3-3.8 2 .3 3.2 1.6 3.3 3.8Zm0 0c2-.4 3.2-1.8 3.3-3.8-2 .3-3.2 1.6-3.3 3.8Z" />
    </svg>
  );
}

export function OreGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <path d="m3 18 4.5-8 3.5 3 3-7 7 12Z" />
      <path d="m7.5 10 1.5 3.5M14 6l.8 5.5" />
    </svg>
  );
}

export function PaperGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <path d="M7 4h11a2 2 0 0 1 0 4H9" />
      <path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8" />
      <path d="M9 11h6M9 14h6M9 17h4" />
    </svg>
  );
}

export function ClothGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <path d="M4 7c3-2 5 2 8 0s5 2 8 0v10c-3 2-5-2-8 0s-5-2-8 0Z" />
      <path d="M4 12c3-2 5 2 8 0s5 2 8 0" />
    </svg>
  );
}

export function CoinGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 9.5v5" />
    </svg>
  );
}

export const CARD_GLYPH: Record<Card, (p: P) => React.ReactElement> = {
  brick: BrickGlyph,
  lumber: LumberGlyph,
  wool: WoolGlyph,
  grain: GrainGlyph,
  ore: OreGlyph,
  paper: PaperGlyph,
  cloth: ClothGlyph,
  coin: CoinGlyph,
};

export function RoadGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <rect x="3" y="9.5" width="18" height="5" rx="1.2" transform="rotate(-20 12 12)" />
    </svg>
  );
}

export function SettlementGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <path d="M5 11 12 5l7 6v8H5Z" />
      <path d="M10 19v-4h4v4" />
    </svg>
  );
}

export function CityGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <path d="M3 20v-8l4-3 4 3v8" />
      <path d="M11 20V7h3V4h2v3h3v13Z" />
      <path d="M3 20h18" />
      <path d="M14.5 11h1M14.5 14h1" />
    </svg>
  );
}

export function DevCardGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="m12 8 1.2 2.5 2.8.4-2 1.9.5 2.7-2.5-1.3-2.5 1.3.5-2.7-2-1.9 2.8-.4Z" />
    </svg>
  );
}

export function RobberGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <circle cx="12" cy="6.5" r="3" />
      <path d="M7 21c0-5 1.5-9.5 5-9.5s5 4.5 5 9.5Z" />
    </svg>
  );
}

export function KnightGlyph({ size, ...p }: P) {
  return (
    <svg {...base(size, p)}>
      <path d="M7 20h10" />
      <path d="M8 20c0-3 .5-4.5 2-6-2-1-3-3-2-6 1-2.5 4-4 7-3l-1 2.5c1.8.5 3 2 3 4.5 0 2-1.2 3-2.8 3.2L15 20" />
      <circle cx="12.5" cy="8.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9Z"
      />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9Z" />
    </svg>
  );
}

export function DiscordMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.76} viewBox="0 0 127.14 96.36" aria-hidden>
      <path
        fill="#5865F2"
        d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z"
      />
    </svg>
  );
}
