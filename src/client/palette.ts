import type { Card, Terrain } from '@/engine/types';

/** Low-poly terrain palette shared by the 3D and 2D boards. */
export const TERRAIN_COLORS: Record<Terrain, { top: string; side: string; accent: string; label: string }> = {
  forest: { top: '#3d7a45', side: '#274f2d', accent: '#23502c', label: 'Forest' },
  hills: { top: '#c8764b', side: '#8d4a2b', accent: '#a9502f', label: 'Hills' },
  pasture: { top: '#a3d170', side: '#6a9446', accent: '#f4f1e6', label: 'Pasture' },
  fields: { top: '#e7c35c', side: '#a8862f', accent: '#f5dc86', label: 'Fields' },
  mountains: { top: '#8f939c', side: '#5d616a', accent: '#eef1f4', label: 'Mountains' },
  desert: { top: '#e2cc97', side: '#a99264', accent: '#c7ad72', label: 'Desert' },
  gold: { top: '#d69a24', side: '#8a5f12', accent: '#fff0a6', label: 'Gold' },
};

export const FOG = { top: '#d9dde2', side: '#9aa1aa', cloud: '#f4f6f8' };

export const SEA = { shallow: '#3e97ad', deep: '#1c5f73', foam: '#d4ece6', sky: '#0b2530' };

export const CARD_COLORS: Record<Card, { bg: string; ink: string; label: string }> = {
  brick: { bg: '#c4673f', ink: '#fff4ea', label: 'Brick' },
  lumber: { bg: '#2f6b3f', ink: '#eef8ea', label: 'Lumber' },
  wool: { bg: '#9ccf6c', ink: '#1f2a12', label: 'Wool' },
  grain: { bg: '#e9c35a', ink: '#3a2a06', label: 'Grain' },
  ore: { bg: '#8d909b', ink: '#f6f7fa', label: 'Ore' },
  paper: { bg: '#d8c7a0', ink: '#3a2d15', label: 'Paper' },
  cloth: { bg: '#b98ad6', ink: '#2b1438', label: 'Cloth' },
  coin: { bg: '#d9a441', ink: '#3a2606', label: 'Coin' },
};
