import * as THREE from 'three';
import { PIPS } from '@/engine/constants';
import type { HarborKind } from '@/engine/types';
import { CARD_COLORS, TOKEN } from '@/client/palette';

/** The page's display font (next/font exposes its generated family through a CSS variable). */
export function displayFont(): string {
  if (typeof document === 'undefined') return 'Georgia, serif';
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-fraunces').trim();
  return family || 'Georgia, serif';
}

const tokenCache = new Map<string, THREE.CanvasTexture>();
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

/** A number token's face in a theme's token colours (classic when omitted). */
export function tokenTexture(n: number, colors: { rim: string; face: string; ink: string; hot: string } = TOKEN): THREE.CanvasTexture {
  const key = `${n}|${colors.rim}|${colors.face}`;
  const hit = tokenCache.get(key);
  if (hit) return hit;
  const [c, g] = canvas256();
  // Our own token look: a sea-blue rim around a paper face, with the odds shown as small diamonds.
  g.fillStyle = colors.rim;
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = colors.face;
  g.beginPath();
  g.arc(128, 128, 106, 0, Math.PI * 2);
  g.fill();
  const red = n === 6 || n === 8;
  g.fillStyle = red ? colors.hot : colors.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  sturdyText(g, String(n), 128, 114, n >= 10 ? 100 : 118);
  const pips = PIPS[n] ?? 0;
  for (let i = 0; i < pips; i++) {
    const x = 128 + (i - (pips - 1) / 2) * 22;
    g.beginPath();
    g.moveTo(x, 182);
    g.lineTo(x + 8, 191);
    g.lineTo(x, 200);
    g.lineTo(x - 8, 191);
    g.closePath();
    g.fill();
  }
  const tex = finish(c);
  tokenCache.set(key, tex);
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

const barbarianBadgeCache = new Map<string, THREE.CanvasTexture>();

/** Two crossing blades, tips up — the defense badge's glyph. */
function drawCrossedSwords(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  g.save();
  g.translate(x, y);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineCap = 'round';
  for (const flip of [1, -1]) {
    g.save();
    g.scale(flip, 1);
    g.lineWidth = s * 0.16;
    g.beginPath();
    g.moveTo(-s * 0.55, s * 0.55);
    g.lineTo(s * 0.55, -s * 0.55);
    g.stroke();
    // crossguard
    g.beginPath();
    g.moveTo(s * 0.18, -s * 0.18);
    g.lineTo(s * 0.34, -s * 0.02);
    g.lineWidth = s * 0.13;
    g.stroke();
    g.restore();
  }
  g.restore();
}

/** A little longship silhouette — the barbarian strength badge's glyph. */
function drawShipGlyph(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(-s * 0.62, s * 0.12);
  g.quadraticCurveTo(-s * 0.5, s * 0.42, 0, s * 0.42);
  g.quadraticCurveTo(s * 0.5, s * 0.42, s * 0.62, s * 0.12);
  g.quadraticCurveTo(0, s * 0.28, -s * 0.62, s * 0.12);
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = s * 0.1;
  g.beginPath();
  g.moveTo(0, s * 0.1);
  g.lineTo(0, -s * 0.55);
  g.stroke();
  g.beginPath();
  g.moveTo(-s * 0.02, -s * 0.5);
  g.lineTo(s * 0.4, -s * 0.34);
  g.lineTo(-s * 0.02, -s * 0.18);
  g.closePath();
  g.fill();
  g.restore();
}

/**
 * A round badge for the barbarian track (C&K): the ship's strength, or the island's defense, with
 * a small glyph above the number. Cached like the harbor/token faces.
 */
export function barbarianBadgeTexture(
  value: number,
  icon: 'ship' | 'swords',
  colors: { rim: string; face: string; ink: string },
): THREE.CanvasTexture {
  const key = `${value}|${icon}|${colors.rim}|${colors.face}|${colors.ink}`;
  const hit = barbarianBadgeCache.get(key);
  if (hit) return hit;
  const [c, g] = canvas256();
  g.fillStyle = colors.rim;
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = colors.face;
  g.beginPath();
  g.arc(128, 128, 106, 0, Math.PI * 2);
  g.fill();
  if (icon === 'ship') drawShipGlyph(g, 128, 84, 46, colors.ink);
  else drawCrossedSwords(g, 128, 82, 40, colors.ink);
  g.fillStyle = colors.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  sturdyText(g, String(value), 128, 168, value >= 10 ? 78 : 90);
  const tex = finish(c);
  barbarianBadgeCache.set(key, tex);
  return tex;
}

/** Call after web fonts load so textures re-render with the real display font. */
export function resetTextureCache(): void {
  for (const t of tokenCache.values()) t.dispose();
  for (const t of harborCache.values()) t.dispose();
  for (const t of barbarianBadgeCache.values()) t.dispose();
  tokenCache.clear();
  harborCache.clear();
  barbarianBadgeCache.clear();
}
