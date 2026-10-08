import type { BoardThemeId } from '@/client/themes';
import type { ReactNode } from 'react';
import type { Board, Building, Knight, PlayerColor } from '@/engine/types';
import type { KnightCustomization } from '@/shared/knight';

export type TargetKind =
  | 'settlement'
  | 'road'
  | 'ship'
  | 'city'
  | 'robber'
  | 'knight'
  | 'knightAction'
  | 'knightDestination'
  /** One of your ships that can sail: clicking it starts the move. */
  | 'shipAction'
  /** Cities & Knights: one of your cities; clicking it opens the city improvements. */
  | 'cityImprove'
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
  /** Per-edge kind, overriding `kind` (Voyagers: a coast edge may take a road or a ship). */
  edgeKinds?: Partial<Record<number, TargetKind>>;
  /** Edge selected as the source of a two-step action (moving a ship). */
  selectedEdge?: number | null;
  /** Build hints: spots offered without a build mode, only shown on hover. */
  hint?: boolean;
  /**
   * The spot whose popup is open (a build, or the robber's next hex): boards keep a ghost of the
   * piece there and anchor the popup to it.
   */
  armed?:
    | { target: 'vertex' | 'edge'; at: number; what: 'road' | 'ship' | 'settlement' | 'city' | 'knight' | 'wall' | 'metropolis' }
    | { target: 'hex'; at: number; what: 'robber' };
}

export const NO_TARGETS: BoardTargets = { kind: null, vertices: [], edges: [], hexes: [] };

/** Everything a board renderer needs; produced from a PlayerView or a demo game. */
export interface BoardScene {
  board: Board;
  robber: number;
  buildings: (Building | null)[];
  roads: (number | null)[];
  /** Voyagers: ships by edge (all null, or missing, on maps without sea). */
  ships?: (number | null)[];
  /** Voyagers: the pirate's sea hex. */
  pirate?: number | null;
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
  /** Hexes to light up instead (the Inventor's swap); while set, `highlightToken` is ignored. */
  highlightHexes?: number[] | null;
  /** The barbarian ship's voyage (C&K only; unset for classic games and demo scenes). */
  barbarian?: { position: number; distance: number; strength: number; defense: number } | null;
}

export interface BoardHandlers {
  onVertex?: (id: number) => void;
  onEdge?: (id: number) => void;
  onHex?: (id: number) => void;
}

export interface BoardProps extends BoardHandlers {
  scene: BoardScene;
  targets: BoardTargets;
  /** Popup content (a build or the robber's confirmation), anchored above `targets.armed`. */
  popup?: ReactNode;
  /** A click on the board that hit no target (closes the popup). */
  onBackground?: () => void;
  interactive?: boolean;
  /** Landing-page mode: slow orbit, no controls. */
  showcase?: boolean;
  /** Stops the render loop (the canvas stays alive), for a board that is mounted but out of sight. */
  paused?: boolean;
  quality?: 'high' | 'low';
  /** Size multiplier for the pieces, number tokens and harbors (the "Board size" setting). */
  pieceScale?: number;
  /** 2D: the margin around the island, in board units (room for the harbors); rulebook snippets fit tighter. */
  fitPad?: number;
  /** How the island looks (the "Board theme" setting); classic when unset. */
  theme?: BoardThemeId;
  /** Themed weather over the 3D board (the "Weather" setting). */
  weather?: boolean;
}
