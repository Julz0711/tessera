/**
 * Plain-text names for moves, for the analysis ("Build a city on 6 ore · 8 grain", "Move the robber to the
 * desert"): short imperative phrases in the game log's wording (src/client/describe.ts). Stored with the
 * analysis, so the client only shows them.
 */
import { CARDS, topo, type Action, type GameState, type Hex, type PartialHand, type Track } from '@/engine';

const TERRAIN_WORD: Record<Hex['terrain'], string> = {
  forest: 'lumber',
  hills: 'brick',
  pasture: 'wool',
  fields: 'grain',
  mountains: 'ore',
  desert: 'desert',
  gold: 'gold',
  sea: 'sea',
};

const TRACK_WORD: Record<Track, string> = { trade: 'Trade', politics: 'Politics', science: 'Science' };
const KNIGHT_LEVEL = ['', 'basic', 'strong', 'mighty'];

/** A tile in a corner or edge label: "6 ore", "desert", "fog". */
function hexLabel(s: GameState, h: number): string {
  const hex = s.board.hexes[h];
  if (!hex) return '?';
  if (hex.fog) return 'fog';
  return hex.token ? `${hex.token} ${TERRAIN_WORD[hex.terrain]}` : TERRAIN_WORD[hex.terrain];
}

/** A tile as a destination: "the desert", "the 6 ore tile", "the sea". */
function tilePhrase(s: GameState, h: number): string {
  const hex = s.board.hexes[h];
  if (!hex) return 'a tile';
  if (hex.fog) return 'a fog tile';
  if (hex.terrain === 'sea') return 'the sea';
  if (!hex.token) return `the ${TERRAIN_WORD[hex.terrain]}`;
  return `the ${hexLabel(s, h)} ${hex.terrain === 'gold' ? 'field' : 'tile'}`;
}

/** A corner by its tiles, best numbers first ("6 ore · 8 grain · 3 wool"); sea is left out. */
function vertexLabel(s: GameState, v: number): string {
  const t = topo(s);
  const hexes = (t.vertices[v]?.hexes ?? []).filter((h) => s.board.hexes[h].terrain !== 'sea');
  if (!hexes.length) return 'the coast';
  return hexes.map((h) => hexLabel(s, h)).join(' · ');
}

/** Where an edge runs: "between 6 ore and 8 grain", "along 5 brick", "on the coast". */
function edgePhrase(s: GameState, e: number): string {
  const t = topo(s);
  const edge = t.edges[e];
  if (!edge) return '';
  const hexes = t.vertices[edge.a].hexes.filter((h) => t.vertices[edge.b].hexes.includes(h) && s.board.hexes[h].terrain !== 'sea');
  if (hexes.length >= 2) return `between ${hexLabel(s, hexes[0])} and ${hexLabel(s, hexes[1])}`;
  if (hexes.length === 1) return `along ${hexLabel(s, hexes[0])}`;
  return 'on the coast';
}

function hand(h: PartialHand): string {
  const parts = CARDS.filter((c) => (h[c] ?? 0) > 0).map((c) => `${h[c]} ${c}`);
  return parts.length ? parts.join(', ') : 'nothing';
}

const name = (s: GameState, seat: number | null | undefined) => (seat === null || seat === undefined ? 'nobody' : (s.players[seat]?.name ?? `seat ${seat + 1}`));

/** "Merchant Fleet" from "merchantFleet". */
const cardName = (type: string) => type.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

function progressName(s: GameState, id: number): string | null {
  const card = s.players.flatMap((p) => p.progress).find((c) => c.id === id);
  return card ? cardName(card.type) : null;
}

const robbing = (s: GameState, victim: number | null) => (victim !== null ? `, robbing ${name(s, victim)}` : '');

/**
 * What `action` does, in a few words, as seen from the state it was played in. `where` adds the place for
 * moves that are otherwise named without one (knights, walls), to tell two of them apart.
 */
export function describeAction(s: GameState, action: Action, where = false): string {
  const at = (v: number) => (where ? ` on ${vertexLabel(s, v)}` : '');
  switch (action.type) {
    case 'endTurn':
      return 'End the turn';
    case 'rollDice':
      return 'Roll the dice';
    case 'buildRoad':
      return `${s.phase === 'setup' ? 'Place' : 'Build'} a road ${edgePhrase(s, action.edge)}`.trimEnd();
    case 'buildShip':
      return `${s.phase === 'setup' ? 'Place' : 'Build'} a ship ${edgePhrase(s, action.edge)}`.trimEnd();
    case 'moveShip':
      return `Move a ship ${edgePhrase(s, action.to)}`.trimEnd();
    case 'buildSettlement':
      return `${s.phase === 'setup' ? 'Place' : 'Build'} a settlement on ${vertexLabel(s, action.vertex)}`;
    case 'buildCity':
      return `${s.phase === 'setup' ? 'Place' : 'Build'} a city on ${vertexLabel(s, action.vertex)}`;
    case 'moveRobber': {
      const pirate = s.board.hexes[action.hex]?.terrain === 'sea';
      return `Move the ${pirate ? 'pirate' : 'robber'} to ${tilePhrase(s, action.hex)}${robbing(s, action.victim)}`;
    }
    case 'discard':
      return `Discard ${hand(action.cards)}`;
    case 'skipFreeRoads':
      return 'Skip the free roads';
    case 'buyDevCard':
      return 'Buy a development card';
    case 'playKnight':
      return 'Play a Knight';
    case 'playRoadBuilding':
      return 'Play Road Building';
    case 'playYearOfPlenty':
      return `Play Year of Plenty for ${action.resources.join(' and ')}`;
    case 'playMonopoly':
      return `Play Monopoly on ${action.resource}`;
    case 'bankTrade':
      return `Trade ${action.count > 1 ? `${action.count}× ` : ''}${action.give} for ${action.get} with the bank`;
    case 'bankExchange':
      return `Trade ${hand(action.give)} for ${hand(action.get)} with the bank`;
    case 'offerTrade':
      return `Offer ${hand(action.give)} for ${action.open ? 'anything' : hand(action.want)}`;
    case 'respondTrade':
      return action.accept ? 'Accept the trade' : 'Decline the trade';
    case 'confirmTrade':
      return `Trade with ${name(s, action.partner)}`;
    case 'cancelTrade':
      return 'Withdraw the offer';
    case 'embargo':
      return action.on ? `Embargo ${name(s, action.seat)}` : `Lift the embargo on ${name(s, action.seat)}`;
    case 'buildKnight':
      return `Build a knight${at(action.vertex)}`;
    case 'activateKnight':
      return `Activate a knight${at(action.vertex)}`;
    case 'promoteKnight': {
      const level = (s.knights[action.vertex]?.level ?? 0) + 1;
      return `Promote a knight${level > 1 && level <= 3 ? ` to ${KNIGHT_LEVEL[level]}` : ''}${at(action.vertex)}`;
    }
    case 'moveKnight':
      return `Move a knight${at(action.to)}`;
    case 'chaseRobber':
      return `Chase the robber with a knight to ${tilePhrase(s, action.hex)}${robbing(s, action.victim)}`;
    case 'buildWall':
      return `Build a city wall${at(action.vertex)}`;
    case 'improveCity': {
      const level = (s.players[s.turn.seat]?.improvements[action.track] ?? 0) + 1;
      return `Improve ${TRACK_WORD[action.track]} to level ${level}`;
    }
    case 'playProgress': {
      const card = progressName(s, action.card);
      return card ? `Play ${card}` : 'Play a progress card';
    }
    case 'loseCity':
      return `Lose the city on ${vertexLabel(s, action.vertex)}`;
    case 'relocateKnight':
      return action.vertex === null ? 'Give up the displaced knight' : `Move the displaced knight${at(action.vertex)}`;
    case 'chooseDeck':
      return `Draw a ${TRACK_WORD[action.track]} progress card`;
    case 'aqueduct':
      return `Take ${action.resource} (Aqueduct)`;
    case 'pickGold':
      return `Take ${hand(action.cards)} from the gold field`;
    case 'discardProgress': {
      const card = progressName(s, action.card);
      return card ? `Discard ${card}` : 'Discard a progress card';
    }
    case 'cancelEndTurn':
      return 'Keep playing';
    case 'giveCards':
      return `Give ${hand(action.cards)}`;
    case 'removeKnight':
      return `Remove a knight${at(action.vertex)}`;
    case 'placeKnight':
      return action.vertex === null ? 'Place no knight' : `Place a knight${at(action.vertex)}`;
    case 'takeProgress': {
      const card = progressName(s, action.card);
      return card ? `Take ${card}` : 'Take a progress card';
    }
    case 'takeCards':
      return `Take ${hand(action.cards)}`;
    case 'placeMetropolis':
      return `Place the metropolis on ${vertexLabel(s, action.vertex)}`;
    default: {
      const type: string = (action as Action).type;
      return cardName(type);
    }
  }
}
