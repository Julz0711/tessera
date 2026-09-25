import type { ReactNode } from 'react';
import type { Board, Building, Knight, PlayerColor } from '@/engine/types';
import type { KnightCustomization } from '@/shared/knight';

export type TargetKind =
  | 'settlement'
  | 'road'
  | 'city'
  | 'robber'
  | 'knight'
  | 'knightAction'
  | 'knightDestination'
  | 'wall'
  | 'merchant'
  | 'hexPick'
  | 'vertexPick'
  | 'edgePick';

export interface BoardTargets {
  kind: TargetKind | null;
  vertices: number[];
  edges: number[];
  hexes: number[];
  /** Vertex currently selected as the source of a two-step action (e.g. moving a knight). */
  selectedVertex?: number | null;
  /** Per-vertex kind, overriding `kind` (build hints mix settlement, city and knight spots). */
  vertexKinds?: Partial<Record<number, TargetKind>>;
  /** Build hints: spots offered without a build mode, only shown on hover. */
  hint?: boolean;
  /** The spot whose build popup is open: boards keep a ghost of the piece there and anchor the popup to it. */
  armed?: { target: 'vertex' | 'edge'; at: number; what: 'road' | 'settlement' | 'city' | 'knight' | 'wall' };
}

export const NO_TARGETS: BoardTargets = { kind: null, vertices: [], edges: [], hexes: [] };

/** Everything a board renderer needs; produced from a PlayerView or a demo game. */
export interface BoardScene {
  board: Board;
  robber: number;
  buildings: (Building | null)[];
  roads: (number | null)[];
  knights: (Knight | null)[];
  merchant: { hex: number; owner: number } | null;
  /** Player colors by seat. */
  colors: PlayerColor[];
  /** Knight customization by seat (cosmetic; from the lobby). */
  styles: (KnightCustomization | null)[];
  /** Color used for ghost previews of the viewer's pieces. */
  myColor: PlayerColor | null;
  /** Last dice total, to highlight producing hexes. */
  highlightToken: number | null;
}

export interface BoardHandlers {
  onVertex?: (id: number) => void;
  onEdge?: (id: number) => void;
  onHex?: (id: number) => void;
}

export interface BoardProps extends BoardHandlers {
  scene: BoardScene;
  targets: BoardTargets;
  /** Build popup content, anchored above `targets.armed`. */
  popup?: ReactNode;
  /** A click on the board that hit no target (closes the popup). */
  onBackground?: () => void;
  interactive?: boolean;
  /** Landing-page mode: slow orbit, no controls. */
  showcase?: boolean;
  quality?: 'high' | 'low';
  /** Size multiplier for the pieces, number tokens and harbors (the "Board size" setting). */
  pieceScale?: number;
}
