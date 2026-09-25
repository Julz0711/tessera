import type { SVGProps } from 'react';

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
