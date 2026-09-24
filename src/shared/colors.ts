import type { PlayerColor } from '@/engine/types';

export interface ColorInfo {
  label: string;
  /** Main piece color. */
  hex: string;
  /** Darker shade for outlines/shadows. */
  dark: string;
  /** Readable text color on top of `hex`. */
  ink: string;
}

export const PLAYER_COLORS: Record<PlayerColor, ColorInfo> = {
  red: { label: 'Red', hex: '#d9483b', dark: '#8f2a22', ink: '#fff7f0' },
  blue: { label: 'Blue', hex: '#3a74d8', dark: '#22468a', ink: '#f3f7ff' },
  orange: { label: 'Orange', hex: '#f08c2e', dark: '#9c5617', ink: '#2b1606' },
  white: { label: 'White', hex: '#f2ede2', dark: '#a39b8a', ink: '#2a2620' },
  green: { label: 'Green', hex: '#3f9b4f', dark: '#245e2f', ink: '#f2fff4' },
  purple: { label: 'Purple', hex: '#8b5bc9', dark: '#553483', ink: '#fbf6ff' },
};

export const COLOR_ORDER: PlayerColor[] = ['red', 'blue', 'orange', 'white', 'green', 'purple'];

export function isPlayerColor(value: unknown): value is PlayerColor {
  return typeof value === 'string' && value in PLAYER_COLORS;
}
