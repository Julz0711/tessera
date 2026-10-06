/**
 * Low-poly card art, drawn to match the flat-shaded 3D board: every shape is built from flat
 * facets lit from the top-left, and each piece gets one ink outline around its silhouette.
 *
 * Illustrations live in a 100×100 box; card faces in a 100×140 box. Everything is generated once
 * per card and cached, so rendering a hand of cards is just a list of polygons.
 */
import { memo, useLayoutEffect, useState } from 'react';
import type { Card, DevCardType } from '@/engine/types';

type Pt = readonly [number, number];
interface Facet {
  pts: readonly Pt[];
  fill: string;
}
/** One piece of a drawing. Its facets share a single ink outline (unless `bare`). */
interface Part {
  facets: Facet[];
  bare?: boolean;
}
interface Art {
  parts: Part[];
  /** Flat shadow on the ground under the object. */
  shadow: { cx: number; cy: number; rx: number; ry: number };
}

const INK = '#131a1d';

// ── colour ───────────────────────────────────────────────────────────────────

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  const c = x.map((v, i) => Math.round(Math.min(255, Math.max(0, v + (y[i] - v) * t))));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}

/** Picks a colour along `stops` (dark → light) for t in 0..1. */
function ramp(stops: readonly string[], t: number): string {
  const k = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  return mix(stops[i], stops[i + 1], k - i);
}

// ── geometry ─────────────────────────────────────────────────────────────────

const unit = (x: number, y: number): Pt => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};
const add = (p: Pt, v: Pt, k = 1): Pt => [p[0] + v[0] * k, p[1] + v[1] * k];
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const rotate = (v: Pt, a: number): Pt => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

/** Direction the light comes from: the top-left, as on the board. */
const LIGHT = unit(-0.55, -0.84);

/** How much a surface facing direction (dx, dy) is lit: 0 = facing away, 1 = facing the light. */
function lit(dx: number, dy: number): number {
  const [x, y] = unit(dx, dy);
  return (x * LIGHT[0] + y * LIGHT[1] + 1) / 2;
}

function ngon(cx: number, cy: number, rx: number, ry: number, n: number, rot = 0): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });
}

/**
 * A low-poly dome: one triangle from `apex` to each edge of `outline`, each lit by the way it
 * faces. `contrast` < 0 flips the lighting, which reads as a groove instead of a bump.
 */
function dome(outline: readonly Pt[], apex: Pt, stops: readonly string[], contrast = 1, bias = 0): Facet[] {
  return outline.map((a, i) => {
    const b = outline[(i + 1) % outline.length];
    const m = mid(a, b);
    return { pts: [apex, a, b], fill: ramp(stops, (lit(m[0] - apex[0], m[1] - apex[1]) - 0.5) * contrast + 0.5 + bias) };
  });
}

/**
 * A chiselled stone: an outer ring of steep facets around a flatter, lighter top, like a low-poly
 * rock. `inset` is how far in the top's edge sits (0..1, toward `apex`).
 */
function chisel(outline: readonly Pt[], apex: Pt, stops: readonly string[], inset = 0.5, bias = 0): Facet[] {
  const inner = outline.map((p) => add(apex, [p[0] - apex[0], p[1] - apex[1]], inset));
  const out: Facet[] = [];
  outline.forEach((a, i) => {
    const j = (i + 1) % outline.length;
    const b = outline[j];
    const m = mid(a, b);
    const t = lit(m[0] - apex[0], m[1] - apex[1]) + bias;
    out.push({ pts: [a, b, inner[j]], fill: ramp(stops, t - 0.04) });
    out.push({ pts: [a, inner[j], inner[i]], fill: ramp(stops, t + 0.04) });
  });
  out.push(...dome(inner, apex, stops, 0.45, 0.2 + bias));
  return out;
}

/** A box seen from the front, with its top and right side receding along `d`. */
function box(x: number, y: number, w: number, h: number, d: Pt, tone: { top: [string, string]; front: [string, string]; side: [string, string] }): Part {
  const A: Pt = [x, y];
  const B: Pt = [x + w, y];
  const C: Pt = [x + w, y + h];
  const D: Pt = [x, y + h];
  const A2 = add(A, d);
  const B2 = add(B, d);
  const C2 = add(C, d);
  return {
    facets: [
      { pts: [A, B2, A2], fill: tone.top[0] },
      { pts: [A, B, B2], fill: tone.top[1] },
      { pts: [B, C2, B2], fill: tone.side[0] },
      { pts: [B, C, C2], fill: tone.side[1] },
      { pts: [A, B, D], fill: tone.front[0] },
      { pts: [B, C, D], fill: tone.front[1] },
    ],
  };
}

/** A lying cylinder seen end-on: bark swept back along `d`, then the sawn end with its rings. */
function log(cx: number, cy: number, r: number, d: Pt): Part {
  const rim = ngon(cx, cy, r, r, 8, Math.PI / 8);
  const bark: Facet[] = [];
  rim.forEach((a, i) => {
    const b = rim[(i + 1) % rim.length];
    const n = unit(mid(a, b)[0] - cx, mid(a, b)[1] - cy);
    if (n[0] * d[0] + n[1] * d[1] <= 0) return;
    bark.push({ pts: [a, b, add(b, d), add(a, d)], fill: ramp(['#3d2413', '#5a381f', '#7b5030', '#98693f'], lit(n[0], n[1])) });
  });
  const c: Pt = [cx, cy];
  return {
    facets: [
      ...bark,
      ...dome(rim, c, ['#3f2615', '#6a4326']),
      ...dome(ngon(cx, cy, r * 0.8, r * 0.8, 8, Math.PI / 8), [cx - r * 0.1, cy - r * 0.14], ['#c08447', '#d9a766', '#eecb8e', '#f8e1b2']),
      ...dome(ngon(cx, cy, r * 0.48, r * 0.48, 8, Math.PI / 8), c, ['#c48b50', '#e4bb80'], -0.9),
      { pts: ngon(cx, cy, r * 0.13, r * 0.13, 6), fill: '#8f5c30' },
    ],
  };
}

/** A grain of wheat: a small four-faceted diamond pointing along `v`. */
function kernel(c: Pt, v: Pt, len = 5.1, wid = 3.1): Facet[] {
  const w: Pt = [-v[1], v[0]];
  const outline: Pt[] = [add(c, v, len), add(c, w, wid), add(c, v, -len), add(c, w, -wid)];
  return dome(outline, add(c, v, len * 0.2), ['#b0741a', '#d4952b', '#efc158', '#fbe39f'], 1.1);
}

/** An ear of wheat on a stalk, growing along `u` from `base`. */
function ear(base: Pt, u: Pt): Part {
  const p: Pt = [-u[1], u[0]];
  const facets: Facet[] = [];
  for (let k = 0; k < 4; k++) {
    for (const side of [-1, 1]) {
      const c = add(add(base, u, 3 + k * 6.6), p, side * 3.5);
      facets.push(...kernel(c, rotate(u, side * 0.42)));
    }
  }
  facets.push(...kernel(add(base, u, 3 + 4 * 6.6 - 1.5), u, 5.2, 2.9));
  return { facets };
}

/** A strip `w` wide along a polyline, split lengthwise into a lit and a shaded half. */
function strip(path: readonly Pt[], w: number, light: string, dark: string): Facet[] {
  const out: Facet[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const [dx, dy] = unit(b[0] - a[0], b[1] - a[1]);
    const n: Pt = [-dy * (w / 2), dx * (w / 2)];
    out.push({ pts: [add(a, n, -1), add(b, n, -1), b, a], fill: lit(-n[0], -n[1]) > 0.5 ? light : dark });
    out.push({ pts: [a, b, add(b, n), add(a, n)], fill: lit(n[0], n[1]) > 0.5 ? light : dark });
  }
  return out;
}

/** A coin lying flat (a shallow ten-sided prism) seen from slightly above. */
function flatCoin(cx: number, cy: number, rx: number, ry: number, t: number): Part {
  const top = ngon(cx, cy, rx, ry, 10);
  const side: Facet[] = [];
  top.forEach((a, i) => {
    const b = top[(i + 1) % top.length];
    if (mid(a, b)[1] <= cy) return;
    side.push({ pts: [a, b, add(b, [0, t]), add(a, [0, t])], fill: ramp(COIN_SIDE, lit(mid(a, b)[0] - cx, 0.6 * (mid(a, b)[1] - cy))) });
  });
  return {
    facets: [
      ...side,
      ...dome(top, [cx - rx * 0.2, cy - ry * 0.3], COIN_FACE, 0.8),
      ...dome(ngon(cx, cy, rx * 0.7, ry * 0.7, 10), [cx, cy], COIN_FACE, -0.7, 0.05),
    ],
  };
}

const COIN_FACE = ['#8e96a5', '#b7bfcb', '#dde2e9', '#f8fafc'];
const COIN_SIDE = ['#4d5462', '#6a7280', '#8a93a1', '#aeb5c1'];

// ── resource and commodity cards ─────────────────────────────────────────────

function brickArt(): Art {
  const tone = {
    top: ['#f2b692', '#e9a27b'] as [string, string],
    front: ['#b9492d', '#a93f26'] as [string, string],
    side: ['#7d2d18', '#6d2714'] as [string, string],
  };
  const d: Pt = [7, -6];
  const rows = [
    { y: 64, xs: [9.5, 34.5, 59.5] },
    { y: 53, xs: [22, 47] },
    { y: 42, xs: [34.5] },
  ];
  return {
    parts: rows.flatMap((row) => row.xs.map((x) => box(x, row.y, 24, 11, d, tone))),
    shadow: { cx: 50, cy: 77.5, rx: 43, ry: 5 },
  };
}

function lumberArt(): Art {
  const d: Pt = [15, -10];
  const r = 14;
  return {
    parts: [log(28.5, 66, r, d), log(56.5, 66, r, d), log(42.5, 41.8, r, d)],
    shadow: { cx: 50, cy: 81, rx: 38, ry: 5 },
  };
}

function woolArt(): Art {
  const wool = ['#b1a891', '#cfc6af', '#e9e3d2', '#fffcf3'];
  const leg = (x: number, bottom: number, shade: number): Part => ({
    facets: strip(
      [
        [x, 60],
        [x, bottom],
      ],
      4.3,
      mix('#4a433c', '#1f1c19', shade),
      mix('#2e2925', '#141210', shade),
    ),
  });
  const puffs: [number, number, number][] = [
    [36, 38, 12],
    [52, 35, 13],
    [65, 44, 11.5],
    [26, 50, 11],
    [47, 48, 14],
    [30, 61, 10],
    [45, 62, 12.5],
    [60, 59, 11.5],
  ];
  const fleece: Facet[] = [...dome(ngon(16, 49, 6, 5.5, 6), [15, 47.5], wool)];
  puffs.forEach(([x, y, r], i) => fleece.push(...dome(ngon(x, y, r, r * 0.9, 7, i * 0.7), [x - r * 0.28, y - r * 0.32], wool)));
  const head: Pt[] = [
    [67, 40],
    [77, 35.5],
    [87, 39.5],
    [92, 49],
    [89.5, 59],
    [81.5, 63.5],
    [73, 58.5],
    [69, 49.5],
  ];
  return {
    parts: [
      leg(31, 78, 0.35),
      leg(58, 78, 0.35),
      { facets: fleece },
      leg(38, 81, 0),
      leg(63, 81, 0),
      {
        facets: [
          { pts: [[70, 41], [58.5, 36.5], [63.5, 46.5]], fill: '#3b3530' },
          { pts: [[70, 41], [63.5, 46.5], [67, 47]], fill: '#27231f' },
        ],
      },
      { facets: dome(head, [80, 46], ['#1b1815', '#2b2723', '#433d37', '#5e564d']) },
      { facets: dome(ngon(76.5, 38.5, 7, 5.2, 6, 0.3), [74.5, 36.5], wool) },
      {
        bare: true,
        facets: [
          { pts: [[82, 47.5], [85.5, 46.5], [86, 49.5], [82.5, 50.2]], fill: '#f3eee4' },
          { pts: [[87.5, 55.5], [90, 55], [89.5, 57.5]], fill: '#15120f' },
        ],
      },
    ],
    shadow: { cx: 50, cy: 82, rx: 36, ry: 4.5 },
  };
}

function grainArt(): Art {
  const tie: Pt = [50, 70];
  const angles = [-0.43, 0.43, 0];
  const stalks: Facet[] = [];
  const ears: Part[] = [];
  for (const a of angles) {
    const u = rotate([0, -1], a);
    const base = add(tie, u, 25);
    stalks.push(...strip([[50 + a * 12, 89], tie, base], 2.8, '#dcb551', '#b1862f'));
    ears.push(ear(base, u));
  }
  const leaf = (pts: Pt[]): Part => ({
    facets: [
      { pts: [pts[0], pts[1], pts[2]], fill: '#a3b64a' },
      { pts: [pts[0], pts[2], pts[3]], fill: '#7c8d31' },
    ],
  });
  return {
    parts: [
      leaf([
        [49, 66],
        [36, 63],
        [25, 73],
        [38, 70],
      ]),
      leaf([
        [51, 62],
        [62, 56],
        [76, 58],
        [63, 61.5],
      ]),
      { facets: stalks },
      {
        facets: [
          { pts: [[42.5, 66.5], [57.5, 66.5], [58.5, 70.5], [41.5, 70.5]], fill: '#98622f' },
          { pts: [[41.5, 70.5], [58.5, 70.5], [57.5, 74.5], [42.5, 74.5]], fill: '#704520' },
        ],
      },
      ...ears,
    ],
    shadow: { cx: 50, cy: 89.5, rx: 17, ry: 3.5 },
  };
}

function oreArt(): Art {
  // Slate with a cold blue cast: iron ore rather than any old rock.
  const rock = ['#3f4552', '#59606e', '#7f8796', '#aab2c0', '#d9dfe8'];
  return {
    parts: [
      {
        facets: chisel(
          [
            [12, 70],
            [15, 53],
            [25, 38],
            [39, 31],
            [52, 36],
            [58, 52],
            [52, 69],
            [30, 75],
          ],
          [33, 47],
          rock,
          0.46,
        ),
      },
      {
        facets: chisel(
          [
            [38, 79],
            [39, 62],
            [50, 48],
            [66, 42],
            [81, 49],
            [89, 64],
            [82, 79],
            [60, 85],
          ],
          [61, 57],
          rock,
          0.5,
        ),
      },
      {
        facets: chisel(
          [
            [13, 84],
            [16, 77],
            [25, 74.5],
            [33, 78.5],
            [31, 86],
            [20, 88],
          ],
          [22, 79.5],
          rock,
          0.45,
          -0.04,
        ),
      },
    ],
    shadow: { cx: 51, cy: 86, rx: 42, ry: 4.5 },
  };
}

function paperArt(): Art {
  const roll = (y: number, r: number): Part[] => {
    const x0 = 21;
    const x1 = 79;
    const bands: [number, number, string][] = [
      [-1, -0.35, '#f7ecd3'],
      [-0.35, 0.35, '#e3cfa2'],
      [0.35, 1, '#c2a571'],
    ];
    return [
      {
        facets: [
          ...dome(ngon(x0 - 4.5, y, 2.8, r * 0.6, 6), [x0 - 5, y - 1], ['#5a3b20', '#8a603a']),
          ...dome(ngon(x1 + 4.5, y, 2.8, r * 0.6, 6), [x1 + 4, y - 1], ['#5a3b20', '#8a603a']),
        ],
      },
      {
        facets: [
          ...bands.map(([a, b, fill]) => ({
            pts: [
              [x0, y + r * a],
              [x1, y + r * a],
              [x1, y + r * b],
              [x0, y + r * b],
            ] as Pt[],
            fill,
          })),
          ...dome(ngon(x0, y, 3, r, 6, Math.PI / 6), [x0 - 0.8, y - 1], ['#9c7d49', '#c7a86f', '#e8d19c']),
          ...dome(ngon(x1, y, 3, r, 6, Math.PI / 6), [x1 - 0.8, y - 1], ['#9c7d49', '#c7a86f', '#e8d19c']),
        ],
      },
    ];
  };
  const TL: Pt = [26, 28];
  const TR: Pt = [74, 28];
  const BR: Pt = [74, 75];
  const BL: Pt = [26, 75];
  const F1: Pt = [52, 28];
  const F2: Pt = [47, 75];
  const lines = [
    [36, 34, 66],
    [43, 34, 61],
    [50, 34, 64],
    [57, 34, 52],
  ].map(([y, x0, x1]) => ({
    pts: [
      [x0, y],
      [x1, y],
      [x1, y + 2.4],
      [x0, y + 2.4],
    ] as Pt[],
    fill: '#b59d72',
  }));
  return {
    parts: [
      {
        facets: [
          { pts: [TL, F1, F2, BL], fill: '#fbf3e1' },
          { pts: [F1, TR, BR, F2], fill: '#ecdcba' },
          { pts: [[74, 60], BR, [60, 75]], fill: '#dcc79e' },
          ...lines,
        ],
      },
      { facets: dome(ngon(59, 63, 7, 7, 8, Math.PI / 8), [57.5, 61.5], ['#7f2014', '#ad2f1d', '#d34d35', '#f07a5d']) },
      ...roll(25, 6.5),
      ...roll(77, 6.5),
    ],
    shadow: { cx: 50, cy: 87, rx: 36, ry: 4 },
  };
}

/** A bolt of cloth, its loose end hanging from the roll and lying unrolled toward you. */
function clothArt(): Art {
  const x0 = 23;
  const x1 = 73;
  const cy = 36;
  const r = 14;
  const tones = ['#7fd2b0', '#58b893', '#3f9b79', '#2c7b5f'];
  const edges = [-1, -0.5, 0, 0.5, 1];
  const bulge = (k: number) => x1 + 6.5 * Math.sqrt(1 - k * k);
  const stripes = [
    { x: 43, w: 3.6, color: '#fbf6e8', k: 0.28 },
    { x: 49, w: 1.4, color: '#1d5a45', k: 0.2 },
    { x: 58, w: 3.6, color: '#fbf6e8', k: 0.28 },
  ];
  const body: Facet[] = [];
  for (let i = 0; i < 4; i++) {
    const ya = cy + r * edges[i];
    const yb = cy + r * edges[i + 1];
    body.push({ pts: [[x0, ya], [bulge(edges[i]), ya], [bulge(edges[i + 1]), yb], [x0, yb]], fill: tones[i] });
    for (const st of stripes) body.push({ pts: [[st.x, ya], [st.x + st.w, ya], [st.x + st.w, yb], [st.x, yb]], fill: mix(st.color, tones[i], st.k) });
  }
  // Panels of the loose end, each a quad [top-left, top-right, bottom-right, bottom-left].
  const hang: Pt[] = [[x0 + 2, 46], [x1 + 2, 46], [x1 + 3, 58], [x0 + 1, 58]];
  const lieL: Pt[] = [[x0 + 1, 58], [48, 58], [45, 73.5], [x0 - 4, 72.5]];
  const lieR: Pt[] = [[48, 58], [x1 + 3, 58], [x1 + 8, 72.5], [45, 73.5]];
  const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  /** A stripe at x = sx..sx+w along a panel's top edge, following the panel down. */
  const along = (q: Pt[], sx: number, w: number): Pt[] | null => {
    const t0 = (sx - q[0][0]) / (q[1][0] - q[0][0]);
    const t1 = (sx + w - q[0][0]) / (q[1][0] - q[0][0]);
    if (t1 <= 0 || t0 >= 1) return null;
    const u0 = Math.max(0, t0);
    const u1 = Math.min(1, t1);
    return [lerp(q[0], q[1], u0), lerp(q[0], q[1], u1), lerp(q[3], q[2], u1), lerp(q[3], q[2], u0)];
  };
  const panel = (q: Pt[], fill: string): Facet[] => [
    { pts: q, fill },
    ...stripes.flatMap((st) => {
      const pts = along(q, st.x, st.w);
      return pts ? [{ pts, fill: mix(st.color, fill, st.k) }] : [];
    }),
  ];
  return {
    parts: [
      {
        facets: [
          ...panel(hang, '#2e7f62'),
          ...panel(lieL, '#6cc8a4'),
          ...panel(lieR, '#5dbb97'),
          // the hem: a wavy front edge showing the cloth's thickness
          { pts: [[x0 - 4, 72.5], [33, 74.3], [45, 73.5], [58, 75], [x1 + 8, 72.5], [x1 + 7.6, 75.5], [58, 78], [45, 76.5], [33, 77.3], [x0 - 3.6, 75.5]], fill: '#2a765b' },
        ],
      },
      { facets: body },
      {
        facets: [
          ...dome(ngon(x0, cy, 6.5, r, 8, Math.PI / 8), [x0 - 1.3, cy - 2], ['#226a51', '#3a9170', '#6cc7a4']),
          ...dome(ngon(x0, cy, 4.3, r * 0.64, 8, Math.PI / 8), [x0, cy], ['#2a765b', '#57b391'], -1),
          ...dome(ngon(x0, cy, 2.2, r * 0.3, 6, Math.PI / 6), [x0 - 0.4, cy - 0.8], ['#8a6538', '#c49a63']),
        ],
      },
    ],
    shadow: { cx: 51, cy: 79, rx: 42, ry: 3.5 },
  };
}

function coinArt(): Art {
  const stack = [0, 1, 2, 3].map((i) => flatCoin(34, 74 - i * 6.2, 18, 6.4, 5.2));
  const c: Pt = [65, 58];
  const R = 19;
  const front = ngon(c[0], c[1], R, R, 10, Math.PI / 10);
  const edge: Facet[] = [];
  const t: Pt = [4.5, 0];
  front.forEach((a, i) => {
    const b = front[(i + 1) % front.length];
    const n = unit(mid(a, b)[0] - c[0], mid(a, b)[1] - c[1]);
    if (n[0] <= 0) return;
    edge.push({ pts: [a, b, add(b, t), add(a, t)], fill: ramp(COIN_SIDE, lit(n[0], n[1])) });
  });
  return {
    parts: [
      ...stack,
      {
        facets: [
          ...edge,
          ...dome(front, [c[0] - 3, c[1] - 3.5], COIN_FACE),
          ...dome(ngon(c[0], c[1], R * 0.74, R * 0.74, 10, Math.PI / 10), c, COIN_FACE, -0.8, 0.04),
          ...dome(star(c[0], c[1] + 0.5, 7.6, 3.2), [c[0] - 0.6, c[1] - 0.2], ['#6f7888', '#a5aebb', '#e9edf2', '#ffffff'], 1.2),
        ],
      },
    ],
    shadow: { cx: 50, cy: 81.5, rx: 40, ry: 4.5 },
  };
}

// ── development cards ────────────────────────────────────────────────────────

const STEEL = ['#4f5864', '#7c8796', '#adb7c4', '#e4e9ef'];
const GOLD = ['#86560f', '#c1871b', '#efbd43', '#fde8a6'];
const WOOD = { light: '#d49454', mid: '#b7773f', dark: '#7a4d27' };

function star(cx: number, cy: number, outer: number, inner: number): Pt[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? inner : outer;
    return [cx + Math.cos(a) * k, cy + Math.sin(a) * k] as Pt;
  });
}

function knightArt(): Art {
  return {
    parts: [
      {
        facets: dome(
          [
            [53, 25],
            [48, 13],
            [39, 6.5],
            [27, 5.5],
            [17, 10],
            [26, 11.5],
            [34, 15.5],
            [40, 22],
            [44, 28],
          ],
          [37, 12.5],
          ['#7f2014', '#b8341f', '#e05a3f', '#f58c70'],
        ),
      },
      {
        facets: [
          ...chisel(
            [
              [29, 79],
              [29, 50],
              [32, 36],
              [40, 26],
              [50, 22],
              [60, 26],
              [68, 36],
              [71, 50],
              [71, 79],
              [62, 84],
              [38, 84],
            ],
            [45, 42],
            STEEL,
            0.52,
          ),
          { pts: [[48.5, 22.5], [50, 22], [50, 84], [48.5, 84]], fill: '#eef2f6' },
          { pts: [[50, 22], [51.5, 22.5], [51.5, 84], [50, 84]], fill: '#8e98a6' },
        ],
      },
      {
        bare: true,
        facets: [
          { pts: [[33, 51], [47.5, 51], [47.5, 56.5], [34, 57]], fill: '#16181c' },
          { pts: [[52.5, 51], [67, 51], [66, 57], [52.5, 56.5]], fill: '#16181c' },
          ...[
            [57, 64],
            [62, 64],
            [59.5, 69],
            [64.5, 69],
          ].map(([x, y]) => ({ pts: ngon(x, y, 1.3, 1.3, 4, Math.PI / 4), fill: '#26292f' })),
        ],
      },
      {
        facets: [
          { pts: [[29, 75], [71, 75], [71, 79], [29, 79]], fill: '#f0bf45' },
          { pts: [[29, 79], [71, 79], [62, 84], [38, 84]], fill: '#c1871b' },
        ],
      },
    ],
    shadow: { cx: 50, cy: 86, rx: 30, ry: 3.5 },
  };
}

function signpostArt(): Art {
  const board = (pts: Pt[], mid: number, top: string, bottom: string): Part => {
    const [a, b, tip, c, d] = pts;
    return {
      facets: [
        { pts: [a, b, tip, [a[0], mid]], fill: top },
        { pts: [[a[0], mid], tip, c, d], fill: bottom },
        { pts: [d, c, add(c, [-1, 2.2]), add(d, [0, 2.2])], fill: WOOD.dark },
      ],
    };
  };
  return {
    parts: [
      {
        facets: chisel(
          [
            [28, 87],
            [32, 80.5],
            [43, 77],
            [57, 77],
            [68, 80.5],
            [72, 87],
          ],
          [47, 80],
          ['#2b6630', '#3d873d', '#58a547', '#7dc45f'],
          0.5,
        ),
      },
      { facets: strip([[50, 83], [50, 20]], 6.5, '#9d6c3d', '#6c4424') },
      board([[34, 24], [68, 24], [78, 32], [68, 40], [34, 40]], 32, WOOD.light, WOOD.mid),
      board([[66, 46], [32, 46], [22, 54], [32, 62], [66, 62]], 54, '#cf8d4d', '#ab6c37'),
      {
        bare: true,
        facets: [
          { pts: ngon(50, 32, 1.4, 1.4, 4, Math.PI / 4), fill: '#3b2616' },
          { pts: ngon(50, 54, 1.4, 1.4, 4, Math.PI / 4), fill: '#3b2616' },
        ],
      },
    ],
    shadow: { cx: 50, cy: 88, rx: 26, ry: 3 },
  };
}

function giftArt(): Art {
  const d: Pt = [12, -9];
  const body = box(24, 52, 44, 28, d, { top: ['#f0826a', '#e7735b'], front: ['#d6503a', '#c34630'], side: ['#99301f', '#8a2a1b'] });
  const lid = box(21, 44, 50, 9, d, { top: ['#f59680', '#ee8670'], front: ['#e05d45', '#cf5139'], side: ['#a53724', '#96311f'] });
  const A: Pt = [21, 44];
  const B: Pt = [71, 44];
  const at = (p: Pt, k: number) => add(p, d, k);
  const ribbon = '#f2c14e';
  body.facets.push(
    { pts: [[43, 52], [49, 52], [49, 80], [43, 80]], fill: ribbon },
    { pts: [[68, 52 + 13], at([68, 65], 1), at([68, 70], 1), [68, 70]], fill: '#c9921f' },
  );
  lid.facets.push(
    { pts: [[43, 44], [49, 44], [49, 53], [43, 53]], fill: '#f6cd62' },
    { pts: [[43, 44], [49, 44], at([49, 44], 1), at([43, 44], 1)], fill: '#fbe08e' },
    { pts: [at(A, 0.4), at(B, 0.4), at(B, 0.6), at(A, 0.6)], fill: '#fbe08e' },
    { pts: [[71, 47], at([71, 47], 1), at([71, 50.5], 1), [71, 50.5]], fill: '#c9921f' },
  );
  const knot = at([46, 44], 0.5);
  return {
    parts: [
      body,
      lid,
      // the bow: two loops and a knot
      {
        facets: dome(
          [
            [knot[0] - 1, knot[1] - 1],
            [knot[0] - 9, knot[1] - 12],
            [knot[0] - 16, knot[1] - 9],
            [knot[0] - 13, knot[1] - 1],
          ],
          [knot[0] - 10, knot[1] - 7],
          GOLD,
        ),
      },
      {
        facets: dome(
          [
            [knot[0] + 1, knot[1] - 1],
            [knot[0] + 13, knot[1] - 2],
            [knot[0] + 16, knot[1] - 10],
            [knot[0] + 9, knot[1] - 12.5],
          ],
          [knot[0] + 10, knot[1] - 7.5],
          GOLD,
        ),
      },
      { facets: dome(ngon(knot[0], knot[1] - 2.5, 3.6, 3.2, 6), [knot[0] - 0.8, knot[1] - 3.5], GOLD) },
    ],
    shadow: { cx: 53, cy: 81.5, rx: 36, ry: 4 },
  };
}

function magnetArt(): Art {
  const arc: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI;
    arc.push([50 + 18 * Math.cos(a), 50 + 18 * Math.sin(a)]);
  }
  const path: Pt[] = [[32, 22], ...arc, [68, 22]];
  return {
    parts: [
      { facets: strip(path, 14, '#e5634a', '#a8321f') },
      { facets: strip([[32, 22], [32, 32]], 14, '#f2f5f8', '#a3acb9') },
      { facets: strip([[68, 22], [68, 32]], 14, '#f2f5f8', '#a3acb9') },
      {
        bare: true,
        facets: [
          { pts: [[24, 14], [28, 8], [30, 15]], fill: '#f2c14e' },
          { pts: [[72, 8], [76, 14], [70, 15]], fill: '#f2c14e' },
          { pts: [[47, 10], [50, 4], [53, 10]], fill: '#f2c14e' },
        ],
      },
    ],
    shadow: { cx: 50, cy: 80, rx: 26, ry: 3.5 },
  };
}

function trophyArt(): Art {
  return {
    parts: [
      { facets: strip([[31, 29], [20, 30], [19, 40], [31, 47]], 4.6, '#f5cd5c', '#b57d17') },
      { facets: strip([[69, 29], [80, 30], [81, 40], [69, 47]], 4.6, '#f5cd5c', '#b57d17') },
      {
        facets: chisel(
          [
            [27, 25],
            [73, 25],
            [70, 40],
            [62, 52],
            [38, 52],
            [30, 40],
          ],
          [44, 34],
          GOLD,
          0.55,
        ),
      },
      {
        facets: [
          { pts: [[25, 20.5], [75, 20.5], [75, 25], [25, 25]], fill: '#fbe08e' },
          { pts: [[46, 52], [54, 52], [53, 62], [47, 62]], fill: '#d69d26' },
          { pts: [[50, 52], [54, 52], [53, 62], [50, 62]], fill: '#b57d17' },
          { pts: [[40, 62], [60, 62], [64, 68], [36, 68]], fill: '#e9b43c' },
        ],
      },
      box(29, 68, 42, 9, [6, -4], { top: ['#8a5a33', '#7a4f2c'], front: ['#6a4323', '#5c3a1e'], side: ['#43291a', '#3a2316'] }),
      { bare: true, facets: dome(star(50, 36.5, 7, 3), [49, 35.5], ['#b9831c', '#f2c14e', '#fff3c4', '#ffffff'], 1.2) },
    ],
    shadow: { cx: 53, cy: 78.5, rx: 32, ry: 3.5 },
  };
}

export type ArtKey = Card | DevCardType;

const ART_BUILDERS: Record<ArtKey, () => Art> = {
  brick: brickArt,
  lumber: lumberArt,
  wool: woolArt,
  grain: grainArt,
  ore: oreArt,
  paper: paperArt,
  cloth: clothArt,
  coin: coinArt,
  knight: knightArt,
  roadBuilding: signpostArt,
  yearOfPlenty: giftArt,
  monopoly: magnetArt,
  victoryPoint: trophyArt,
};

// ── rendering ────────────────────────────────────────────────────────────────

interface RenderedArt {
  parts: { bare: boolean; facets: { points: string; fill: string }[] }[];
  shadow: string;
}

const pointsOf = (pts: readonly Pt[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

const artCache = new Map<ArtKey, RenderedArt>();
function renderedArt(card: ArtKey): RenderedArt {
  let hit = artCache.get(card);
  if (!hit) {
    const art = ART_BUILDERS[card]();
    const s = art.shadow;
    hit = {
      parts: art.parts.map((p) => ({ bare: !!p.bare, facets: p.facets.map((f) => ({ points: pointsOf(f.pts), fill: f.fill })) })),
      shadow: pointsOf(ngon(s.cx, s.cy, s.rx, s.ry, 8, Math.PI / 8)),
    };
    artCache.set(card, hit);
  }
  return hit;
}

/** The illustration as SVG elements in its 100×100 box (no `<svg>` wrapper). */
export const ArtShapes = memo(function ArtShapes({ card, shadow, outline = 2.6 }: { card: ArtKey; shadow?: string; outline?: number }) {
  const art = renderedArt(card);
  return (
    <>
      {shadow && <polygon points={art.shadow} fill={shadow} />}
      {art.parts.map((part, i) => (
        <g key={i}>
          {!part.bare && outline > 0 && (
            <g fill={INK} stroke={INK} strokeWidth={outline * 2} strokeLinejoin="round">
              {part.facets.map((f, j) => (
                <polygon key={j} points={f.points} />
              ))}
            </g>
          )}
          {part.facets.map((f, j) => (
            <polygon key={j} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth={0.5} strokeLinejoin="round" />
          ))}
        </g>
      ))}
    </>
  );
});

// ── faceted card background ──────────────────────────────────────────────────

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const bgCache = new Map<string, { points: string; fill: string }[]>();

/**
 * A card-sized (100×140) low-poly backdrop: a jittered grid of triangles in shades of `color`,
 * brightest near the top-middle where the art sits and deeper toward the edges.
 */
export function facetBackground(color: string, seed: string, depth = 1): { points: string; fill: string }[] {
  const key = `${color}|${seed}|${depth}`;
  const hit = bgCache.get(key);
  if (hit) return hit;
  const rnd = seeded(seed);
  const cols = 4;
  const rows = 5;
  const grid: Pt[][] = [];
  for (let r = 0; r <= rows; r++) {
    const row: Pt[] = [];
    for (let c = 0; c <= cols; c++) {
      const x = c === 0 ? -1 : c === cols ? 101 : (c / cols) * 100 + (rnd() - 0.5) * 14;
      const y = r === 0 ? -1 : r === rows ? 141 : (r / rows) * 140 + (rnd() - 0.5) * 16;
      row.push([x, y]);
    }
    grid.push(row);
  }
  const out: { points: string; fill: string }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = grid[r][c];
      const b = grid[r][c + 1];
      const d = grid[r + 1][c];
      const e = grid[r + 1][c + 1];
      const tris: Pt[][] = (r + c) % 2 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
      for (const t of tris) {
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
        const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        const k = (0.14 - (Math.hypot(cx - 42, (cy - 38) * 0.8) / 110) * 0.3 + (rnd() - 0.5) * 0.07) * depth;
        out.push({ points: pointsOf(t), fill: k > 0 ? mix(color, '#ffffff', k) : mix(color, '#000000', -k) });
      }
    }
  }
  bgCache.set(key, out);
  return out;
}

/** `depth` scales the shading: 1 is the full low-poly relief, lower is gentler. */
export const FacetBackground = memo(function FacetBackground({ color, seed, depth = 1 }: { color: string; seed: string; depth?: number }) {
  return (
    <>
      {facetBackground(color, seed, depth).map((f, i) => (
        <polygon key={i} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth={0.5} strokeLinejoin="round" />
      ))}
    </>
  );
});

const SVG_NS = 'http://www.w3.org/2000/svg';
const MINI_OUTLINE = 4.5;
let sprite: SVGSVGElement | null = null;

/**
 * Puts the icon-sized art for `card` into a hidden page-wide sprite (once). Each art is ~100
 * polygons, and a long game log shows hundreds of icons: drawn inline they were tens of thousands
 * of elements, re-rendered on every update.
 */
function ensureSpriteArt(card: ArtKey): void {
  if (!sprite?.isConnected) {
    sprite = document.createElementNS(SVG_NS, 'svg');
    sprite.setAttribute('aria-hidden', 'true');
    sprite.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    document.body.appendChild(sprite);
  }
  const id = miniArtId(card);
  if (sprite.querySelector(`#${id}`)) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.id = id;
  const polygon = (parent: Element, points: string, attrs: Record<string, string>) => {
    const el = document.createElementNS(SVG_NS, 'polygon');
    el.setAttribute('points', points);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    parent.appendChild(el);
  };
  for (const part of renderedArt(card).parts) {
    const pg = document.createElementNS(SVG_NS, 'g');
    if (!part.bare) {
      const ink = document.createElementNS(SVG_NS, 'g');
      for (const [k, v] of Object.entries({ fill: INK, stroke: INK, 'stroke-width': String(MINI_OUTLINE * 2), 'stroke-linejoin': 'round' })) ink.setAttribute(k, v);
      for (const f of part.facets) polygon(ink, f.points, {});
      pg.appendChild(ink);
    }
    for (const f of part.facets) polygon(pg, f.points, { fill: f.fill, stroke: f.fill, 'stroke-width': '0.5', 'stroke-linejoin': 'round' });
    g.appendChild(pg);
  }
  sprite.appendChild(g);
}

const miniArtId = (card: ArtKey) => `mini-art-${card}`;

/** The art on its own at icon size (log lines, costs, the bank), with a bolder outline to hold up small. */
export const MiniArt = memo(function MiniArt({ card, size = 16 }: { card: ArtKey; size?: number }) {
  useLayoutEffect(() => ensureSpriteArt(card), [card]);
  return (
    <svg width={size} height={size} viewBox="4 8 92 88" aria-hidden className="shrink-0">
      <use href={`#${miniArtId(card)}`} />
    </svg>
  );
});

/** Square bitmap size of a board icon: sharp at the board's closest zoom on a high-density screen. */
const BITMAP_PX = 256;
/** The art's own box (as MiniArt's viewBox), and a square around its centre with room for the outline. */
const ART_BOX = 92;
const BITMAP_VIEW = '0 2 100 100';
const bitmaps = new Map<ArtKey, Promise<string>>();

/**
 * The icon art drawn once to a PNG (in the browser). The board pans and zooms by redrawing every
 * frame, and as live SVG the art is a few hundred outlined polygons per tile: the whole island's
 * icons doubled the frame time. As a bitmap each icon costs one image.
 */
function artBitmap(card: ArtKey): Promise<string> {
  let hit = bitmaps.get(card);
  if (!hit) {
    hit = (async () => {
      const parts = renderedArt(card).parts.map((part) => {
        const ink = part.bare
          ? ''
          : `<g fill="${INK}" stroke="${INK}" stroke-width="${MINI_OUTLINE * 2}" stroke-linejoin="round">${part.facets.map((f) => `<polygon points="${f.points}"/>`).join('')}</g>`;
        return ink + part.facets.map((f) => `<polygon points="${f.points}" fill="${f.fill}" stroke="${f.fill}" stroke-width="0.5" stroke-linejoin="round"/>`).join('');
      });
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BITMAP_PX}" height="${BITMAP_PX}" viewBox="${BITMAP_VIEW}">${parts.join('')}</svg>`;
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = BITMAP_PX;
      canvas.getContext('2d')!.drawImage(img, 0, 0, BITMAP_PX, BITMAP_PX);
      return canvas.toDataURL('image/png');
    })();
    bitmaps.set(card, hit);
  }
  return hit;
}

/**
 * The same icon art placed inside another SVG (the 2D board's tiles), `size` units square and
 * centred at (cx, cy), so each tile shows the card it pays out. Drawn from a cached bitmap (see
 * artBitmap); the live art stands in for the moment it takes to make one.
 */
export const BoardArt = memo(function BoardArt({ card, cx, cy, size }: { card: ArtKey; cx: number; cy: number; size: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useLayoutEffect(() => {
    let live = true;
    ensureSpriteArt(card);
    artBitmap(card).then((u) => live && setUrl(u), () => {});
    return () => {
      live = false;
    };
  }, [card]);
  if (url) {
    const s = (size * 100) / ART_BOX;
    return <image href={url} x={cx - s / 2} y={cy - s / 2} width={s} height={s} aria-hidden />;
  }
  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size} viewBox="4 8 92 88" overflow="visible" aria-hidden>
      <use href={`#${miniArtId(card)}`} />
    </svg>
  );
});

/** A flat cream hexagon token (for progress cards' icons), centred at (cx, cy) in a card face. */
export function Medallion({ cx, cy, r, outline = 2.4 }: { cx: number; cy: number; r: number; outline?: number }) {
  return <polygon points={pointsOf(ngon(cx, cy, r, r, 6, Math.PI / 6))} fill="#f6eddb" stroke={INK} strokeWidth={outline} strokeLinejoin="round" />;
}
