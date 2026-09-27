import type { Card, Terrain } from '@/engine/types';

/** Low-poly terrain palette shared by the 3D and 2D boards. */
export const TERRAIN_COLORS: Record<Terrain, { top: string; side: string; accent: string; label: string }> = {
  forest: { top: '#3d7a45', side: '#274f2d', accent: '#23502c', label: 'Forest' },
  hills: { top: '#c8764b', side: '#8d4a2b', accent: '#a9502f', label: 'Hills' },
  pasture: { top: '#a3d170', side: '#6a9446', accent: '#f4f1e6', label: 'Pasture' },
  fields: { top: '#e7c35c', side: '#a8862f', accent: '#f5dc86', label: 'Fields' },
  mountains: { top: '#8f939c', side: '#5d616a', accent: '#eef1f4', label: 'Mountains' },
  desert: { top: '#e2cc97', side: '#a99264', accent: '#c7ad72', label: 'Desert' },
  gold: { top: '#e8870a', side: '#6e3f05', accent: '#fff0a6', label: 'Gold' },
};

/** Number tokens (3D and 2D): a sea-blue rim around a paper face; 6 and 8 in red. */
export const TOKEN = { rim: '#1c5f73', face: '#f6eddb', ink: '#1f1a14', hot: '#c2412d' };

export const FOG = { top: '#d9dde2', side: '#9aa1aa', cloud: '#f4f6f8' };

export const SEA = { shallow: '#3e97ad', deep: '#1c5f73', foam: '#d4ece6', sky: '#0b2530' };

/**
 * Card colors. `bg` is the card itself, `ink` reads on top of it and `deep` is a dark tone of the
 * same hue for icons and text on light backgrounds. Each commodity shares its resource's hue family
 * but in a clearly different tone: paper is a pine green (lumber a leaf green), cloth a mint (wool
 * a lime) and coin a bright silver (ore a slate grey).
 */
export const CARD_COLORS: Record<Card, { bg: string; ink: string; deep: string; label: string }> = {
  brick: { bg: '#c4673f', ink: '#fff4ea', deep: '#7a3417', label: 'Brick' },
  lumber: { bg: '#2f6b3f', ink: '#eef8ea', deep: '#173a20', label: 'Lumber' },
  wool: { bg: '#9ccf6c', ink: '#1f2a12', deep: '#46702a', label: 'Wool' },
  grain: { bg: '#e9c35a', ink: '#3a2a06', deep: '#8a6a12', label: 'Grain' },
  ore: { bg: '#8d909b', ink: '#f6f7fa', deep: '#454852', label: 'Ore' },
  paper: { bg: '#2f6f62', ink: '#eaf6f0', deep: '#153d34', label: 'Paper' },
  cloth: { bg: '#8ed8b8', ink: '#10281d', deep: '#2b6b50', label: 'Cloth' },
  coin: { bg: '#c9ced6', ink: '#23272e', deep: '#565d69', label: 'Coin' },
};

/** Mixes a #rrggbb color toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const ch = (v: number) => Math.round(v + (target - v) * k);
  const [r, g, b] = [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)];
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
