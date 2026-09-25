'use client';

/**
 * What the viewer can click on the board right now, and what a click does. Shared by the 2D and
 * 3D boards: they only render `computeTargets` and forward clicks to `handlePick`.
 */
import {
  COSTS,
  hasCards,
  piecesLeft,
  intrigueTargets,
  inventorHexes,
  knightMoveTargets,
  legalCitySpots,
  legalKnightSpots,
  legalRoadSpots,
  legalSettlementSpots,
  legalSetupRoads,
  merchantHexes,
  metropolisSpots,
  openRoads,
  promotableKnights,
  robberTargets,
  robberVictims,
  wallSpots,
  type Action,
  type ProgressCardType,
  type ProgressParams,
} from '@/engine';
import type { PlayerView } from '@/engine/view';
import { NO_TARGETS, type BoardTargets, type TargetKind } from '@/components/board/types';
import { api } from './store';
import { useUi, type UiMode } from './ui';

export interface PickSpec {
  target: 'vertex' | 'hex' | 'edge';
  allowed: number[];
  /** Picks required; `upTo` allows finishing early (Smith). */
  need: number;
  upTo?: boolean;
  hint: string;
}

/** Board picks a progress card needs, or null when it is played from a dialog / straight away. */
export function progressPickSpec(view: PlayerView, type: ProgressCardType): PickSpec | null {
  const me = view.viewer!;
  switch (type) {
    case 'engineer':
      return { target: 'vertex', allowed: wallSpots(view, me), need: 1, hint: 'Pick a city for the free wall' };
    case 'medicine':
      return { target: 'vertex', allowed: legalCitySpots(view, me), need: 1, hint: 'Pick a settlement to upgrade (2 ore + 1 grain)' };
    case 'intrigue':
      return { target: 'vertex', allowed: intrigueTargets(view, me), need: 1, hint: 'Pick an opponent knight on your roads' };
    case 'smith':
      return { target: 'vertex', allowed: promotableKnights(view, me), need: 2, upTo: true, hint: 'Pick up to two knights to promote' };
    case 'merchant':
      return { target: 'hex', allowed: merchantHexes(view, me), need: 1, hint: 'Pick a hex next to your settlement or city' };
    case 'inventor':
      return { target: 'hex', allowed: inventorHexes(view), need: 2, hint: 'Pick two number tokens to swap' };
    case 'diplomat':
      return { target: 'edge', allowed: openRoads(view), need: 1, hint: 'Pick an open road to remove' };
    default:
      return null;
  }
}

export function progressParams(type: ProgressCardType, picked: number[]): ProgressParams {
  switch (type) {
    case 'smith':
      return { vertices: picked };
    case 'merchant':
      return { hex: picked[0] };
    case 'inventor':
      return { hexes: picked };
    case 'diplomat':
      return { edge: picked[0] };
    default:
      return { vertex: picked[0] };
  }
}

function ownKnights(view: PlayerView): number[] {
  const out: number[] = [];
  view.knights.forEach((k, v) => {
    if (k && k.owner === view.viewer) out.push(v);
  });
  return out;
}

/** Roads, settlements and cities the viewer can afford and place right now. */
function affordableSpots(view: PlayerView, me: number): { roads: number[]; settlements: number[]; cities: number[] } {
  const hand = view.players[me].hand;
  const left = piecesLeft(view, me);
  return {
    roads: left.roads > 0 && hasCards(hand, COSTS.road) ? legalRoadSpots(view, me) : [],
    settlements: left.settlements > 0 && hasCards(hand, COSTS.settlement) ? legalSettlementSpots(view, me) : [],
    cities: left.cities > 0 && hasCards(hand, COSTS.city) ? legalCitySpots(view, me) : [],
  };
}

/**
 * @param hints Offer affordable build spots when nothing is selected (colonist-style): a click
 *   builds right away, without picking Road/Settle/City first.
 */
export function computeTargets(view: PlayerView | null, mode: UiMode, hints = false): BoardTargets {
  if (!view || view.viewer === null || view.phase === 'ended') return NO_TARGETS;
  const me = view.viewer;

  if (view.phase === 'setup') {
    const setup = view.setup;
    if (!setup || setup.order[setup.index] !== me) return NO_TARGETS;
    return setup.placing === 'settlement'
      ? { ...NO_TARGETS, kind: 'settlement', vertices: legalSettlementSpots(view, me, true) }
      : { ...NO_TARGETS, kind: 'road', edges: legalSetupRoads(view) };
  }

  const prompt = view.pending.find((p) => p.seat === me);
  if (prompt) {
    switch (prompt.kind) {
      case 'freeRoads':
        return { ...NO_TARGETS, kind: 'road', edges: legalRoadSpots(view, me) };
      case 'robber':
        return { ...NO_TARGETS, kind: 'robber', hexes: robberTargets(view, me, (s) => view.players[s].publicVP) };
      case 'loseCity':
        return {
          ...NO_TARGETS,
          kind: 'vertexPick',
          vertices: view.buildings.flatMap((b, v) => (b && b.owner === me && b.city && !b.metropolis ? [v] : [])),
        };
      case 'relocateKnight':
      case 'deserterPlace':
        return { ...NO_TARGETS, kind: 'knight', vertices: legalKnightSpots(view, me) };
      case 'deserterRemove':
        return { ...NO_TARGETS, kind: 'vertexPick', vertices: ownKnights(view) };
      case 'placeMetropolis':
        return { ...NO_TARGETS, kind: 'vertexPick', vertices: metropolisSpots(view, me) };
      default:
        return NO_TARGETS;
    }
  }
  if (view.pending.length || view.turn.seat !== me || view.phase !== 'play' || !view.turn.rolled) return NO_TARGETS;

  if (mode?.t === 'build') {
    switch (mode.what) {
      case 'road':
        return { ...NO_TARGETS, kind: 'road', edges: legalRoadSpots(view, me) };
      case 'settlement':
        return { ...NO_TARGETS, kind: 'settlement', vertices: legalSettlementSpots(view, me) };
      case 'city':
        return { ...NO_TARGETS, kind: 'city', vertices: legalCitySpots(view, me) };
      case 'knight':
        return { ...NO_TARGETS, kind: 'knight', vertices: legalKnightSpots(view, me) };
      case 'wall':
        return { ...NO_TARGETS, kind: 'wall', vertices: wallSpots(view, me) };
    }
  }
  if (mode?.t === 'knightMove') {
    const { moves, displaces } = knightMoveTargets(view, me, mode.from);
    return { ...NO_TARGETS, kind: 'knightDestination', vertices: [...moves, ...displaces], selectedVertex: mode.from };
  }
  if (mode?.t === 'knightChase') {
    return { ...NO_TARGETS, kind: 'robber', hexes: robberTargets(view, me, (s) => view.players[s].publicVP), selectedVertex: mode.from };
  }
  if (mode?.t === 'progress') {
    const spec = progressPickSpec(view, mode.cardType);
    if (!spec) return NO_TARGETS;
    const allowed = spec.allowed.filter((id) => !mode.picked.includes(id));
    const kind = spec.target === 'hex' ? 'hexPick' : spec.target === 'edge' ? 'edgePick' : 'vertexPick';
    return {
      kind,
      vertices: spec.target === 'vertex' ? allowed : [],
      edges: spec.target === 'edge' ? allowed : [],
      hexes: spec.target === 'hex' ? allowed : [],
    };
  }
  // Cities & Knights: your knights are clickable for their action menu.
  const knights = view.mode === 'ck' ? ownKnights(view) : [];
  if (!hints) return knights.length ? { ...NO_TARGETS, kind: 'knightAction', vertices: knights } : NO_TARGETS;
  // Knights and walls stay behind their buttons: their spots overlap settlement spots.
  const spots = affordableSpots(view, me);
  const vertexKinds: Partial<Record<number, TargetKind>> = {};
  for (const v of spots.settlements) vertexKinds[v] = 'settlement';
  for (const v of spots.cities) vertexKinds[v] = 'city';
  for (const v of knights) vertexKinds[v] = 'knightAction';
  const vertices = [...spots.settlements, ...spots.cities, ...knights];
  if (!vertices.length && !spots.roads.length) return NO_TARGETS;
  return { kind: spots.roads.length ? 'road' : 'settlement', vertices, edges: spots.roads, hexes: [], vertexKinds, hint: true };
}

async function send(action: Action, then?: () => void): Promise<void> {
  const r = await api.act(action);
  if (r.ok) then?.();
}

/** Applies a click on a highlighted board element. */
export async function handlePick(view: PlayerView, target: 'vertex' | 'edge' | 'hex', id: number): Promise<void> {
  const ui = useUi.getState();
  const me = view.viewer;
  if (me === null) return;

  if (view.phase === 'setup') {
    return send(target === 'vertex' ? { type: 'buildSettlement', vertex: id } : { type: 'buildRoad', edge: id });
  }

  const prompt = view.pending.find((p) => p.seat === me);
  if (prompt) {
    switch (prompt.kind) {
      case 'freeRoads':
        return send({ type: 'buildRoad', edge: id });
      case 'robber': {
        const victims = robberVictims(view, me, id);
        if (prompt.reason !== 'bishop' && victims.length > 1) return ui.setRobber({ hex: id, chaseFrom: null });
        return send({ type: 'moveRobber', hex: id, victim: prompt.reason === 'bishop' ? null : (victims[0] ?? null) });
      }
      case 'loseCity':
        return send({ type: 'loseCity', vertex: id });
      case 'relocateKnight':
        return send({ type: 'relocateKnight', vertex: id });
      case 'deserterPlace':
        return send({ type: 'placeKnight', vertex: id });
      case 'deserterRemove':
        return send({ type: 'removeKnight', vertex: id });
      case 'placeMetropolis':
        return send({ type: 'placeMetropolis', vertex: id });
      default:
        return;
    }
  }

  const mode = ui.mode;
  const done = () => useUi.getState().setMode(null);
  if (mode?.t === 'build') {
    switch (mode.what) {
      case 'road':
        return send({ type: 'buildRoad', edge: id }, done);
      case 'settlement':
        return send({ type: 'buildSettlement', vertex: id }, done);
      case 'city':
        return send({ type: 'buildCity', vertex: id }, done);
      case 'knight':
        return send({ type: 'buildKnight', vertex: id }, done);
      case 'wall':
        return send({ type: 'buildWall', vertex: id }, done);
    }
  }
  if (mode?.t === 'knightMove') return send({ type: 'moveKnight', from: mode.from, to: id }, done);
  if (mode?.t === 'knightChase') {
    const victims = robberVictims(view, me, id);
    if (victims.length > 1) return ui.setRobber({ hex: id, chaseFrom: mode.from });
    return send({ type: 'chaseRobber', vertex: mode.from, hex: id, victim: victims[0] ?? null }, done);
  }
  if (mode?.t === 'progress') {
    const spec = progressPickSpec(view, mode.cardType);
    if (!spec) return;
    const picked = [...mode.picked, id];
    if (picked.length >= spec.need) return send({ type: 'playProgress', card: mode.card, params: progressParams(mode.cardType, picked) }, done);
    return ui.setMode({ ...mode, picked });
  }
  if (target === 'vertex' && view.knights[id]?.owner === me) return ui.setKnightMenu(id);
  // Build hints: the spot itself says what gets built.
  if (target === 'edge') return send({ type: 'buildRoad', edge: id });
  if (target === 'vertex') {
    const b = view.buildings[id];
    if (!b) return send({ type: 'buildSettlement', vertex: id });
    if (b.owner === me && !b.city) return send({ type: 'buildCity', vertex: id });
  }
}
