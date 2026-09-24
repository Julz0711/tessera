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

function finish(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function tokenTexture(n: number): THREE.CanvasTexture {
  const hit = tokenCache.get(n);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
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
  g.font = `800 ${n >= 10 ? 106 : 124}px ${displayFont()}`;
  g.fillText(String(n), 128, 112);
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
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
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
  g.font = `800 92px ${displayFont()}`;
  g.fillText(kind === 'any' ? '3:1' : '2:1', 128, kind === 'any' ? 128 : 112);
  if (kind !== 'any') {
    g.font = `700 34px ${displayFont()}`;
    g.fillStyle = CARD_COLORS[kind].bg === '#e9c35a' ? '#8a6a12' : CARD_COLORS[kind].bg;
    g.fillText(CARD_COLORS[kind].label.toUpperCase(), 128, 180);
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
