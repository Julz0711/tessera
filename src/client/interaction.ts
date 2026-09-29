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
  legalSetupShips,
  legalShipSpots,
  sailableShips,
  shipDestinations,
  merchantHexes,
  metropolisSpots,
  openRoads,
  promotableKnights,
  relocationSpots,
  robberTargets,
  robberVictims,
  wallSpots,
  type Action,
  type ProgressCardType,
  type ProgressParams,
} from '@/engine';
import type { PlayerView } from '@/engine/view';
import { NO_TARGETS, type BoardTargets, type TargetKind } from '@/components/board/types';
import { usePrefs } from './prefs';
import { api } from './store';
import { useUi, type Armed, type BuildOption, type BuildWhat, type RobberPick, type UiMode } from './ui';

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

/** Pieces the viewer can afford and place right now, by spot. */
function affordableSpots(view: PlayerView, me: number): Record<'roads' | 'ships' | 'settlements' | 'cities' | 'knights' | 'walls', number[]> {
  const hand = view.players[me].hand;
  const left = piecesLeft(view, me);
  const ck = view.mode === 'ck';
  return {
    roads: left.roads > 0 && hasCards(hand, COSTS.road) ? legalRoadSpots(view, me) : [],
    ships: left.ships > 0 && hasCards(hand, COSTS.ship) ? legalShipSpots(view, me) : [],
    settlements: left.settlements > 0 && hasCards(hand, COSTS.settlement) ? legalSettlementSpots(view, me) : [],
    cities: left.cities > 0 && hasCards(hand, COSTS.city) ? legalCitySpots(view, me) : [],
    knights: ck && left.knights[1] > 0 && hasCards(hand, COSTS.knight) ? legalKnightSpots(view, me) : [],
    walls: ck && left.walls > 0 && hasCards(hand, COSTS.wall) ? wallSpots(view, me) : [],
  };
}

/**
 * @param hints Offer affordable build spots when nothing is selected (colonist-style): they show
 *   on hover, and a click opens the build popup there without picking Road/Settle/City first.
 * @param armed The spot whose build popup is open; it keeps a ghost of the piece.
 * @param robber The hex picked for the robber, waiting for confirmation; it keeps a ghost robber.
 */
export function computeTargets(view: PlayerView | null, mode: UiMode, hints = false, armed: Armed | null = null, robber: RobberPick | null = null): BoardTargets {
  const targets = baseTargets(view, mode, hints);
  if (targets === NO_TARGETS) return targets;
  if (armed) return { ...targets, armed: { target: armed.target, at: armed.at, what: armed.options[0].what } };
  if (robber && targets.kind === 'robber') return { ...targets, armed: { target: 'hex', at: robber.hex, what: 'robber' } };
  return targets;
}

function baseTargets(view: PlayerView | null, mode: UiMode, hints: boolean): BoardTargets {
  if (!view || view.viewer === null || view.phase === 'ended') return NO_TARGETS;
  const me = view.viewer;

  if (view.phase === 'setup') {
    const setup = view.setup;
    // A pending prompt (a gold pick from a discovery) must be settled before placing on.
    if (!setup || setup.order[setup.index] !== me || view.pending.length) return NO_TARGETS;
    return setup.placing === 'settlement'
      ? { ...NO_TARGETS, kind: 'settlement', vertices: legalSettlementSpots(view, me, true) }
      : routeTargets(legalSetupRoads(view), legalSetupShips(view));
  }

  const prompt = view.pending.find((p) => p.seat === me);
  if (prompt) {
    switch (prompt.kind) {
      case 'freeRoads':
        return routeTargets(piecesLeft(view, me).roads > 0 ? legalRoadSpots(view, me) : [], piecesLeft(view, me).ships > 0 ? legalShipSpots(view, me) : []);
      case 'robber':
        return { ...NO_TARGETS, kind: 'robber', hexes: robberTargets(view, me, (s) => view.players[s].publicVP, prompt.reason !== 'bishop') };
      case 'loseCity':
        return {
          ...NO_TARGETS,
          kind: 'vertexPick',
          vertices: view.buildings.flatMap((b, v) => (b && b.owner === me && b.city && !b.metropolis ? [v] : [])),
        };
      case 'relocateKnight':
        return { ...NO_TARGETS, kind: 'knight', vertices: relocationSpots(view, me, prompt.from) };
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
      case 'ship':
        return { ...NO_TARGETS, kind: 'ship', edges: legalShipSpots(view, me) };
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
    return { ...NO_TARGETS, kind: 'robber', hexes: robberTargets(view, me, (s) => view.players[s].publicVP, false), selectedVertex: mode.from };
  }
  if (mode?.t === 'shipMove') {
    if (mode.from === null) return { ...NO_TARGETS, kind: 'edgePick', edges: sailableShips(view, me) };
    return { ...NO_TARGETS, kind: 'ship', edges: shipDestinations(view, me, mode.from), selectedEdge: mode.from };
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
  const spots = affordableSpots(view, me);
  const vertexKinds: Partial<Record<number, TargetKind>> = {};
  for (const v of spots.knights) vertexKinds[v] = 'knight';
  // A corner that takes a settlement or a knight previews the settlement; the popup offers both.
  for (const v of spots.settlements) vertexKinds[v] = 'settlement';
  for (const v of spots.cities) vertexKinds[v] = 'city';
  for (const v of spots.walls) vertexKinds[v] = 'wall';
  for (const v of knights) vertexKinds[v] = 'knightAction';
  const vertices = Object.keys(vertexKinds).map(Number);
  const routes = routeTargets(spots.roads, spots.ships);
  if (!vertices.length && !routes.edges.length) return NO_TARGETS;
  return { ...routes, kind: routes.edges.length ? routes.kind : 'settlement', vertices, hexes: [], vertexKinds, hint: true };
}

/** Road and ship spots together; an edge that only takes a ship is marked as one. */
function routeTargets(roads: number[], ships: number[]): BoardTargets {
  const edgeKinds: Partial<Record<number, TargetKind>> = {};
  for (const e of ships) edgeKinds[e] = 'ship';
  for (const e of roads) edgeKinds[e] = 'road';
  const edges = [...new Set([...roads, ...ships])];
  return { ...NO_TARGETS, kind: roads.length || !ships.length ? 'road' : 'ship', edges, edgeKinds };
}

/** Road and/or ship options for a clicked edge (free in setup and Road Building). */
function routeOptions(view: PlayerView, id: number, roads: number[], ships: number[], free: boolean): BuildOption[] {
  const out: BuildOption[] = [];
  if (roads.includes(id)) out.push(free ? { what: 'road', action: { type: 'buildRoad', edge: id }, cost: null } : buildOption('road', id));
  if (ships.includes(id)) out.push(free ? { what: 'ship', action: { type: 'buildShip', edge: id }, cost: null } : buildOption('ship', id));
  return out;
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
    if (target === 'edge') return arm('edge', id, routeOptions(view, id, legalSetupRoads(view), legalSetupShips(view), true), false);
    // Cities & Knights: the second placement is a city.
    const city = view.mode === 'ck' && (view.setup?.index ?? 0) >= view.players.length;
    return arm('vertex', id, [{ what: city ? 'city' : 'settlement', action: { type: 'buildSettlement', vertex: id }, cost: null }], false);
  }

  const prompt = view.pending.find((p) => p.seat === me);
  if (prompt) {
    switch (prompt.kind) {
      case 'freeRoads': {
        const left = piecesLeft(view, me);
        const options = routeOptions(view, id, left.roads > 0 ? legalRoadSpots(view, me) : [], left.ships > 0 ? legalShipSpots(view, me) : [], true);
        return options.length ? arm('edge', id, options, false) : undefined;
      }
      case 'robber':
        return pickRobberHex(view, id, null);
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
  if (mode?.t === 'build') return arm(target === 'edge' ? 'edge' : 'vertex', id, [buildOption(mode.what, id)], true);
  if (mode?.t === 'knightMove') return send({ type: 'moveKnight', from: mode.from, to: id }, done);
  if (mode?.t === 'knightChase') return pickRobberHex(view, id, mode.from);
  if (mode?.t === 'shipMove') {
    if (mode.from === null || mode.from === id) return ui.setMode({ t: 'shipMove', from: mode.from === id ? null : id });
    return send({ type: 'moveShip', from: mode.from, to: id }, done);
  }
  if (mode?.t === 'progress') {
    const spec = progressPickSpec(view, mode.cardType);
    if (!spec) return;
    const picked = [...mode.picked, id];
    if (picked.length >= spec.need) return send({ type: 'playProgress', card: mode.card, params: progressParams(mode.cardType, picked) }, done);
    return ui.setMode({ ...mode, picked });
  }
  if (target === 'vertex' && view.knights[id]?.owner === me) return ui.setKnightMenu(id);
  // Build hints: offer whatever the spot can take.
  const spots = affordableSpots(view, me);
  if (target === 'edge') {
    const options = routeOptions(view, id, spots.roads, spots.ships, false);
    return options.length ? arm('edge', id, options, false) : undefined;
  }
  if (target !== 'vertex') return;
  const offers = [
    ['settlement', spots.settlements],
    ['knight', spots.knights],
    ['city', spots.cities],
    ['wall', spots.walls],
  ] as const;
  const options = offers.flatMap(([what, at]) => (at.includes(id) ? [buildOption(what, id)] : []));
  if (options.length) return arm('vertex', id, options, false);
}

/** Who the viewer chooses between when the robber goes to `hex` (nobody for the Bishop: it robs everyone there). */
export function robberPickVictims(view: PlayerView, hex: number): number[] {
  const me = view.viewer;
  if (me === null) return [];
  const prompt = view.pending.find((p) => p.seat === me);
  return prompt?.kind === 'robber' && prompt.reason === 'bishop' ? [] : robberVictims(view, me, hex);
}

/**
 * Picks the robber's new hex: a popup there (with a ghost robber) asks first, so a stray click
 * can't move it. A second click on the hex or Enter confirms; with confirmation turned off, only a
 * choice between several victims still asks.
 */
function pickRobberHex(view: PlayerView, hex: number, chaseFrom: number | null): Promise<void> | void {
  const ui = useUi.getState();
  const again = ui.robber?.hex === hex && ui.robber.chaseFrom === chaseFrom;
  ui.setRobber({ hex, chaseFrom });
  if (again || !usePrefs.getState().confirmBuilds) return confirmRobber(view);
}

/**
 * Moves the robber to the picked hex and robs `victim`. Left out, the victim is the only one there
 * (or nobody); a choice between several keeps the popup open.
 */
export async function confirmRobber(view: PlayerView, victim?: number): Promise<void> {
  const ui = useUi.getState();
  const pick = ui.robber;
  if (!pick) return;
  // The pick only stands while the robber is still waiting for this move.
  const targets = baseTargets(view, ui.mode, false);
  if (targets.kind !== 'robber' || !targets.hexes.includes(pick.hex)) return ui.setRobber(null);
  const victims = robberPickVictims(view, pick.hex);
  if (victim === undefined && victims.length > 1) return;
  const robbed = victim ?? victims[0] ?? null;
  ui.setRobber(null);
  if (pick.chaseFrom === null) return send({ type: 'moveRobber', hex: pick.hex, victim: robbed });
  return send({ type: 'chaseRobber', vertex: pick.chaseFrom, hex: pick.hex, victim: robbed }, () => useUi.getState().setMode(null));
}

function buildOption(what: BuildWhat, at: number): BuildOption {
  const action: Action =
    what === 'road'
      ? { type: 'buildRoad', edge: at }
      : what === 'ship'
        ? { type: 'buildShip', edge: at }
        : what === 'settlement'
        ? { type: 'buildSettlement', vertex: at }
        : what === 'city'
          ? { type: 'buildCity', vertex: at }
          : what === 'knight'
            ? { type: 'buildKnight', vertex: at }
            : { type: 'buildWall', vertex: at };
  return { what, action, cost: COSTS[what] };
}

/**
 * Opens the build popup on a spot. A second click on the open spot builds its only option; with
 * confirmation turned off, a single option is built straight away.
 */
function arm(target: 'vertex' | 'edge', at: number, options: BuildOption[], endsMode: boolean): Promise<void> | void {
  const ui = useUi.getState();
  const armed: Armed = { target, at, options, endsMode };
  const again = ui.armed?.target === target && ui.armed.at === at;
  if (options.length === 1 && (again || !usePrefs.getState().confirmBuilds)) return build(armed, 0);
  ui.arm(armed);
}

/** Builds option `i` of the open build popup (its buttons, a second click or Enter). */
export async function confirmBuild(i = 0): Promise<void> {
  const armed = useUi.getState().armed;
  if (armed) return build(armed, i);
}

async function build(armed: Armed, i: number): Promise<void> {
  const option = armed.options[i];
  if (!option) return;
  return send(option.action, () => {
    const ui = useUi.getState();
    if (armed.endsMode) ui.setMode(null);
    else ui.arm(null);
  });
}
