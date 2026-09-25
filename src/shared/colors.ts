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
  teal: { label: 'Teal', hex: '#18a39b', dark: '#0d625d', ink: '#effffd' },
  pink: { label: 'Pink', hex: '#e5649f', dark: '#973a64', ink: '#fff3f8' },
  brown: { label: 'Brown', hex: '#86552f', dark: '#4f2f17', ink: '#fbf1e6' },
  black: { label: 'Black', hex: '#34313a', dark: '#121016', ink: '#f4f1ea' },
};

export const COLOR_ORDER: PlayerColor[] = ['red', 'blue', 'orange', 'white', 'green', 'purple', 'teal', 'pink', 'brown', 'black'];

export function isPlayerColor(value: unknown): value is PlayerColor {
  return typeof value === 'string' && value in PLAYER_COLORS;
}
