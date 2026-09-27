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

const barbarianStatusCache = new Map<string, THREE.CanvasTexture>();

/** One sword, tip up, centred on the top of its grip (units of `s`). */
function drawSword(g: CanvasRenderingContext2D, s: number): void {
  g.beginPath();
  g.moveTo(0, -s);
  g.lineTo(s * 0.17, -s * 0.75);
  g.lineTo(s * 0.17, s * 0.25);
  g.lineTo(-s * 0.17, s * 0.25);
  g.lineTo(-s * 0.17, -s * 0.75);
  g.closePath();
  g.rect(-s * 0.43, s * 0.25, s * 0.86, s * 0.19);
  g.rect(-s * 0.09, s * 0.44, s * 0.18, s * 0.36);
  g.moveTo(s * 0.15, s * 0.89);
  g.arc(0, s * 0.89, s * 0.15, 0, Math.PI * 2);
  g.fill();
  g.stroke();
}

/** Two swords crossing, tips up — the island's knight defense. */
function drawCrossedSwords(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.strokeStyle = '#0b2233';
  g.lineWidth = s * 0.06;
  g.lineJoin = 'round';
  for (const a of [-0.7, 0.7]) {
    g.save();
    g.rotate(a);
    drawSword(g, s);
    g.restore();
  }
  g.restore();
}

/** A small ship: the barbarians' strength. */
function drawShipGlyph(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(-s, s * 0.2);
  g.lineTo(s, s * 0.2);
  g.lineTo(s * 0.6, s * 0.75);
  g.lineTo(-s * 0.6, s * 0.75);
  g.closePath();
  g.rect(-s * 0.07, -s, s * 0.14, s * 1.2);
  g.moveTo(s * 0.1, -s * 0.92);
  g.lineTo(s * 0.85, -s * 0.2);
  g.lineTo(s * 0.1, -s * 0.08);
  g.closePath();
  g.moveTo(-s * 0.1, -s * 0.75);
  g.lineTo(-s * 0.7, -s * 0.08);
  g.lineTo(-s * 0.1, 0);
  g.closePath();
  g.fill();
  g.restore();
}

/**
 * The barbarian field's status sign (2:1 wide): the barbarians' strength against the island's
 * knight defense, whoever is ahead in their colour.
 */
export function barbarianStatusTexture(strength: number, defense: number): THREE.CanvasTexture {
  const key = `${strength}|${defense}`;
  const hit = barbarianStatusCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  g.fillStyle = 'rgba(11, 34, 51, 0.88)';
  g.beginPath();
  g.roundRect(4, 4, 248, 120, 28);
  g.fill();
  const losing = strength > defense;
  const bad = '#ff8a73';
  const good = '#8fe0a8';
  const paper = '#f6eddb';
  drawShipGlyph(g, 52, 64, 26, losing ? bad : paper);
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = losing ? bad : paper;
  sturdyText(g, String(strength), 86, 70, 64);
  drawCrossedSwords(g, 162, 62, 30, losing ? paper : good);
  g.fillStyle = losing ? paper : good;
  sturdyText(g, String(defense), 196, 70, 64);
  const tex = finish(c);
  barbarianStatusCache.set(key, tex);
  return tex;
}

/** Call after web fonts load so textures re-render with the real display font. */
export function resetTextureCache(): void {
  for (const t of tokenCache.values()) t.dispose();
  for (const t of harborCache.values()) t.dispose();
  for (const t of barbarianStatusCache.values()) t.dispose();
  tokenCache.clear();
  harborCache.clear();
  barbarianStatusCache.clear();
}
