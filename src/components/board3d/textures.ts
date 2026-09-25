import * as THREE from 'three';
import { PIPS } from '@/engine/constants';
import type { HarborKind } from '@/engine/types';
import { CARD_COLORS } from '@/client/palette';

/** The page's display font (next/font exposes its generated family through a CSS variable). */
export function displayFont(): string {
  if (typeof document === 'undefined') return 'Georgia, serif';
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-fraunces').trim();
  return family || 'Georgia, serif';
}

const tokenCache = new Map<number, THREE.CanvasTexture>();
const harborCache = new Map<string, THREE.CanvasTexture>();

/** Textures are drawn on a 256-unit square, rendered at twice that so they stay crisp up close. */
function canvas256(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  return [c, g];
}

function finish(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16; // three.js clamps this to what the GPU supports
  return tex;
}

/**
 * Sturdy numerals that survive grazing camera angles. The browser picks Fraunces' optical size
 * from the font size, and at large sizes that is the display cut with hairline strokes (the
 * diagonal of a 4 all but vanishes). So the text is set small and scaled up, which keeps the
 * robust text cut, plus a thin outline in the same colour.
 */
function sturdyText(g: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, weight = 900): void {
  const k = 4;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.font = `${weight} ${px / k}px ${displayFont()}`;
  g.fillText(text, 0, 0);
  g.lineJoin = 'round';
  g.lineWidth = (px * 0.03) / k;
  g.strokeStyle = g.fillStyle;
  g.strokeText(text, 0, 0);
  g.restore();
}

export function tokenTexture(n: number): THREE.CanvasTexture {
  const hit = tokenCache.get(n);
  if (hit) return hit;
  const [c, g] = canvas256();
  g.fillStyle = '#f6eddb';
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = '#d9c9a6';
  g.beginPath();
  g.arc(128, 128, 112, 0, Math.PI * 2);
  g.stroke();
  const red = n === 6 || n === 8;
  g.fillStyle = red ? '#c2412d' : '#1f1a14';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  sturdyText(g, String(n), 128, 112, n >= 10 ? 106 : 124);
  const pips = PIPS[n] ?? 0;
  for (let i = 0; i < pips; i++) {
    g.beginPath();
    g.arc(128 + (i - (pips - 1) / 2) * 22, 190, 7.5, 0, Math.PI * 2);
    g.fill();
  }
  const tex = finish(c);
  tokenCache.set(n, tex);
  return tex;
}

export function harborTexture(kind: HarborKind): THREE.CanvasTexture {
  const hit = harborCache.get(kind);
  if (hit) return hit;
  const [c, g] = canvas256();
  const ring = kind === 'any' ? '#f6eddb' : CARD_COLORS[kind].bg;
  g.fillStyle = ring;
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f6eddb';
  g.beginPath();
  g.arc(128, 128, 98, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1f1a14';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  sturdyText(g, kind === 'any' ? '3:1' : '2:1', 128, kind === 'any' ? 128 : 112, 92);
  if (kind !== 'any') {
    g.fillStyle = CARD_COLORS[kind].deep;
    sturdyText(g, CARD_COLORS[kind].label.toUpperCase(), 128, 180, 34, 800);
  }
  const tex = finish(c);
  harborCache.set(kind, tex);
  return tex;
}

/** Call after web fonts load so textures re-render with the real display font. */
export function resetTextureCache(): void {
  for (const t of tokenCache.values()) t.dispose();
  for (const t of harborCache.values()) t.dispose();
  tokenCache.clear();
  harborCache.clear();
}
