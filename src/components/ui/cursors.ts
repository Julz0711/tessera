// Custom cursor options (preview only, not applied app-wide yet). Each cursor is a 32x32
// SVG in the house style: ink outline, solid fills, paper and amber accents. They are
// exported both as raw SVG (for previewing) and as CSS `cursor` values (data URI + fallback).

const INK = '#131a1d';
const PAPER = '#fbfcfc';
const AMBER = '#f6be4c';

/** Points of a regular hexagon, rounded to 2 decimals. `rot` is the angle of the first vertex in degrees. */
function hexPoints(cx: number, cy: number, r: number, rot: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((rot + i * 60) * Math.PI) / 180;
    return `${+(cx + r * Math.cos(a)).toFixed(2)},${+(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

const ARROW = 'M4 3 L4 25 L9.5 20 L13.5 29 L18.5 26.8 L14.6 18 L22 18 Z';
const arrow = `<path d="${ARROW}" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>`;

// A: classic arrow redrawn in the house style.
const A_DEFAULT = svg(`${arrow}<polygon points="${hexPoints(16.4, 24.4, 2.6, 30)}" fill="${AMBER}" stroke="${INK}" stroke-width="1.4"/>`);
const A_POINTER = svg(`${arrow}<polygon points="${hexPoints(23.5, 23.5, 6, 30)}" fill="${AMBER}" stroke="${INK}" stroke-width="2"/><circle cx="23.5" cy="23.5" r="1.6" fill="${INK}"/>`);

// B: hex-headed pointer, the tip is a sharp corner of a hexagon tile.
const B_DEFAULT = svg(`<polygon points="${hexPoints(13, 13, 11, 45)}" fill="${PAPER}" stroke="${INK}" stroke-width="2"/><polygon points="${hexPoints(13, 13, 4.2, 45)}" fill="${AMBER}" stroke="${INK}" stroke-width="1.5"/>`);
const B_POINTER = svg(`<polygon points="${hexPoints(13, 13, 11, 45)}" fill="${AMBER}" stroke="${INK}" stroke-width="2"/><polygon points="${hexPoints(13, 13, 4.2, 45)}" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>`);

// C: game-piece pointer, a pennant on a pole; the pointer is a gauntlet hand.
const C_DEFAULT = svg(
  `<path d="M7 5 L25 11 L7 17 Z" fill="${AMBER}" stroke="${INK}" stroke-width="2"/><rect x="4.5" y="3" width="3" height="26" rx="1" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>`,
);
const C_POINTER = svg(
  `<path d="M10 5 Q10 2.5 12 2.5 Q14 2.5 14 5 V14 Q14.5 12.5 17 12.5 Q19.5 12.5 19.5 14.5 Q20.3 13 22.2 13 Q24.5 13 24.5 15.5 Q25.5 14.8 26.3 15.4 Q27.5 16.2 27.5 18.5 V24 Q27.5 29.5 22 29.5 H16.5 Q12.5 29.5 10.5 25.5 L5.6 17.6 Q5 16 6.6 15.6 Q8.2 15.3 10 17.8 Z" fill="${PAPER}" stroke="${INK}" stroke-width="2"/><path d="M14 17.5 V21 M19.5 17.5 V21 M24.5 18.5 V21" fill="none" stroke="${INK}" stroke-width="1.5"/><path d="M13 25.5 H27" fill="none" stroke="${AMBER}" stroke-width="3"/>`,
);

const url = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

export type CursorOption = { default: string; pointer: string };

export const CURSOR_OPTIONS: Record<'a' | 'b' | 'c', CursorOption> = {
  a: { default: `${url(A_DEFAULT)} 4 3, auto`, pointer: `${url(A_POINTER)} 4 3, pointer` },
  b: { default: `${url(B_DEFAULT)} 5 5, auto`, pointer: `${url(B_POINTER)} 5 5, pointer` },
  c: { default: `${url(C_DEFAULT)} 6 4, auto`, pointer: `${url(C_POINTER)} 12 3, pointer` },
};

export const CURSOR_SVGS: Record<'a' | 'b' | 'c', CursorOption> = {
  a: { default: A_DEFAULT, pointer: A_POINTER },
  b: { default: B_DEFAULT, pointer: B_POINTER },
  c: { default: C_DEFAULT, pointer: C_POINTER },
};

export const CURSOR_LABELS: Record<'a' | 'b' | 'c', string> = {
  a: 'A  Arrow with a hex notch',
  b: 'B  Hex-tip pointer',
  c: 'C  Pennant and gauntlet',
};
