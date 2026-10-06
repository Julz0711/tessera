import { CARDS, type Card, type DevCardType, type Dice, type GameEvent, type PartialHand, type ProgressCardType, type Track, type TreasureKind } from '@/engine/types';
import { legalSetupShips, shipsInPlay } from '@/engine/queries';
import type { PlayerView } from '@/engine/view';
import { TERRAIN_COLORS } from './palette';

/** A log line: text pieces with inline player names, card chips, dice and a button lighting up hexes. */
export type Part = string | { player: number } | { card: Card; n: number } | { dice: Dice } | { hexes: number[] };

export const DEV_NAMES: Record<DevCardType, string> = {
  knight: 'Knight',
  victoryPoint: 'Victory Point',
  roadBuilding: 'Road Building',
  yearOfPlenty: 'Year of Plenty',
  monopoly: 'Monopoly',
};

export const DEV_TEXT: Record<DevCardType, string> = {
  knight: 'Move the robber and steal a card. Three knights earn the Largest Army.',
  victoryPoint: 'Worth 1 victory point. Counted automatically, so keep it secret!',
  roadBuilding: 'Place two roads for free.',
  yearOfPlenty: 'Take any two resources from the bank.',
  monopoly: 'Name a resource: every other player gives you all of theirs.',
};

export const PROGRESS_NAMES: Record<ProgressCardType, string> = {
  alchemist: 'Alchemist',
  crane: 'Crane',
  engineer: 'Engineer',
  inventor: 'Inventor',
  irrigation: 'Irrigation',
  medicine: 'Medicine',
  mining: 'Mining',
  printer: 'Printer',
  roadBuilding: 'Road Building',
  smith: 'Smith',
  bishop: 'Bishop',
  constitution: 'Constitution',
  deserter: 'Deserter',
  diplomat: 'Diplomat',
  intrigue: 'Intrigue',
  saboteur: 'Saboteur',
  spy: 'Spy',
  warlord: 'Warlord',
  wedding: 'Wedding',
  commercialHarbor: 'Commercial Harbor',
  masterMerchant: 'Master Merchant',
  merchant: 'Merchant',
  merchantFleet: 'Merchant Fleet',
  resourceMonopoly: 'Resource Monopoly',
  tradeMonopoly: 'Trade Monopoly',
};

export const TRACK_NAMES: Record<Track, string> = { trade: 'Trade', politics: 'Politics', science: 'Science' };

export function cardParts(h: PartialHand): Part[] {
  const out: Part[] = [];
  for (const c of CARDS) if ((h[c] ?? 0) > 0) out.push({ card: c, n: h[c]! });
  return out.length ? out : ['nothing'];
}

function count(h: PartialHand): number {
  return CARDS.reduce((n, c) => n + (h[c] ?? 0), 0);
}

/** The card treasure depends on the rules: see the `treasure` line. */
const TREASURE_NAMES: Record<Exclude<TreasureKind, 'devCard'>, string> = {
  resource: 'a resource of choice',
  roadBuilding: 'two free roads or ships',
  bundle: 'wool, grain and brick',
};

const PIECE: Record<string, string> = { road: 'a road', ship: 'a ship', settlement: 'a settlement', city: 'a city', wall: 'a city wall' };

/** Describes an event for the game log; returns one or more lines (or none). */
export function describe(ev: GameEvent, view: PlayerView): Part[][] {
  const P = (seat: number): Part => ({ player: seat });
  // The viewer's name shows as "You", which needs its own verb form.
  const you = (seat: number, mine: string, theirs: string) => (seat === view.viewer ? mine : theirs);
  const s = ev.secret as Record<string, unknown> | undefined;
  switch (ev.type) {
    case 'gameStarted':
      return [['The game has begun.']];
    case 'turnStarted':
      return [];
    case 'diceRolled': {
      const total = ev.dice.red + ev.dice.yellow;
      const extra = ev.dice.event ? ` · ${ev.dice.event === 'ship' ? 'barbarians advance' : `${TRACK_NAMES[ev.dice.event]} gate`}` : '';
      return [[P(ev.seat), ' rolled ', { dice: ev.dice }, ` ${total}${extra}`]];
    }
    case 'produced':
      return ev.gains.flatMap((g, seat) => (count(g) ? [[P(seat), ' got ', ...cardParts(g)]] : []));
    case 'shortage':
      return [ev.only === undefined ? [`The bank ran short of ${ev.card}: nobody gets any.`] : [`The bank ran short of ${ev.card}: `, P(ev.only), ' got what was left.']];
    case 'built':
      return [[P(ev.seat), ev.free ? ' placed ' : ' built ', PIECE[ev.piece] ?? ev.piece]];
    case 'treasure': {
      // Knights & Barbarians: a progress card from the deck of your choice; otherwise the top development card.
      const what = ev.kind === 'devCard' ? (view.mode === 'ck' ? 'a progress card of choice' : 'a development card') : TREASURE_NAMES[ev.kind];
      return [[P(ev.seat), ev.at === null ? ' found open sea and a bonus treasure: ' : ' found a treasure: ', what]];
    }
    case 'islandSettled':
      return [[P(ev.seat), ` settled a new island: +${ev.vp} point${ev.vp === 1 ? '' : 's'}`]];
    case 'shipMoved':
      return [[P(ev.seat), ' sailed a ship to a new route']];
    case 'robberMoved': {
      if (ev.pirate) return [[P(ev.seat), ' sailed the pirate to a new sea hex']];
      const hex = view.board.hexes[ev.hex];
      return [[P(ev.seat), ` moved the robber to ${TERRAIN_COLORS[hex.terrain].label.toLowerCase()}${hex.token ? ` (${hex.token})` : ''}`]];
    }
    case 'stole':
      return [[P(ev.seat), ' stole ', ...(s?.card ? [{ card: s.card as Card, n: 1 }] : ['a card']), ' from ', P(ev.victim)]];
    case 'discarded':
      return [[P(ev.seat), ' discarded ', ...cardParts(ev.cards)]];
    case 'devBought':
      return [[P(ev.seat), ev.free ? ' drew a development card' : ' bought a development card', ...(s?.card ? [` (${DEV_NAMES[s.card as DevCardType]})`] : [])]];
    case 'devPlayed':
      return [[P(ev.seat), ` played ${DEV_NAMES[ev.card]}`]];
    case 'monopoly':
      // Monopoly takes every card; the C&K monopolies take up to 2 (resource) or 1 (commodity) from each player.
      return [ev.total ? [P(ev.seat), ' took ', { card: ev.card, n: ev.total }, ' from the others'] : [P(ev.seat), ` called ${ev.card}, but nobody had any`]];
    case 'received': {
      if (ev.from !== undefined) return [[P(ev.seat), ' took ', ...cardParts(ev.cards), ' from ', P(ev.from)]];
      const verb = ev.reason === 'gold' ? ' struck gold: ' : ev.reason === 'discovery' ? ' found ' : ' received ';
      return [[P(ev.seat), verb, ...cardParts(ev.cards)]];
    }
    case 'revealed':
      return [
        [
          P(ev.seat),
          ' discovered ',
          ev.hexes.map((h) => `${TERRAIN_COLORS[h.terrain].label}${h.token ? ` (${h.token})` : ''}`).join(', '),
          { hexes: ev.hexes.map((h) => h.id) },
        ],
      ];
    case 'bankTrade':
      return [[P(ev.seat), ' traded ', ...cardParts(ev.give), ' for ', ...cardParts(ev.get), ' with the bank']];
    case 'trade':
      return [[P(ev.seat), ' gave ', ...cardParts(ev.give), ' to ', P(ev.partner), ' for ', ...cardParts(ev.get)]];
    case 'tradeOffered':
    case 'tradeClosed':
      return [];
    case 'longestRoad':
      return [ev.seat === null ? ['Nobody holds the Longest Road now.'] : [P(ev.seat), ` took the Longest Road (${ev.length})`]];
    case 'largestArmy':
      return [ev.seat === null ? ['Nobody holds the Largest Army.'] : [P(ev.seat), ` took the Largest Army (${ev.knights} knights)`]];
    case 'gameOver':
      return [[P(ev.winner), you(ev.winner, ' win the game! 🏆', ' wins the game! 🏆')]];
    case 'barbarianAdvanced':
      return [[`The barbarian ship sails closer (${ev.position}/7).`]];
    case 'barbarianAttack':
      return [
        [
          ev.won
            ? `The barbarians attacked (${ev.strength}): the knights (${ev.defense}) held the island!`
            : `The barbarians (${ev.strength}) overran the knights (${ev.defense})!`,
        ],
      ];
    case 'cityLost':
      return [[P(ev.seat), ' lost a city to the barbarians']];
    case 'defenderAwarded':
      return [[P(ev.seat), you(ev.seat, ' are', ' is'), ' the Defender of the island (+1 VP)']];
    case 'progressDrawn': {
      const which = s?.card ? [` (${PROGRESS_NAMES[s.card as ProgressCardType]})`] : [];
      // Spy: taken from another player's hand rather than drawn.
      if (ev.from !== undefined) return [[P(ev.seat), ` took a ${TRACK_NAMES[ev.track]} progress card from `, P(ev.from), ...which]];
      return [[P(ev.seat), ` drew a ${TRACK_NAMES[ev.track]} progress card`, ...which]];
    }
    case 'progressPlayed':
      return [[P(ev.seat), ` played ${PROGRESS_NAMES[ev.card]}`]];
    case 'progressDiscarded':
      return [[P(ev.seat), ` discarded a ${TRACK_NAMES[ev.track]} progress card`]];
    case 'knightBuilt':
      return [[P(ev.seat), ' recruited a knight']];
    case 'knightActivated':
      return [[P(ev.seat), ' activated a knight']];
    case 'knightPromoted':
      return [[P(ev.seat), ` promoted a knight to ${['', 'basic', 'strong', 'mighty'][ev.level]}`]];
    case 'knightMoved':
      return [[P(ev.seat), ' moved a knight']];
    case 'knightDisplaced':
      return [[P(ev.seat), ' displaced a knight of ', P(ev.victim)]];
    case 'knightRemoved':
      return [[P(ev.seat), ' lost a knight']];
    case 'improved':
      return [[P(ev.seat), ` improved ${TRACK_NAMES[ev.track]} to level ${ev.level}`]];
    case 'metropolis':
      return [[P(ev.seat), ` founded the ${TRACK_NAMES[ev.track]} metropolis`, ...(ev.from !== null ? [' (taken from ', P(ev.from), ')'] : [])]];
    case 'merchantPlaced':
      return [[P(ev.seat), ' placed the merchant']];
    case 'roadRemoved':
      // Your own road only leaves to be placed again (Diplomat): the next entry says where. (Your own ship logs as a move.)
      return ev.owner === ev.seat
        ? [[P(ev.seat), you(ev.seat, ' moved one of your roads', ' moved one of their roads')]]
        : [[P(ev.seat), ` removed a ${ev.ship ? 'ship' : 'road'} of `, P(ev.owner)]];
    case 'tokensSwapped': {
      const where = (hex: number, token: number) => `the ${token} (${TERRAIN_COLORS[view.board.hexes[hex].terrain].label})`;
      const what = ev.tokens ? ` swapped ${where(ev.a, ev.tokens[0])} and ${where(ev.b, ev.tokens[1])}` : ' swapped two number tokens';
      return [[P(ev.seat), what, { hexes: [ev.a, ev.b] }]];
    }
  }
}

export function playerName(view: PlayerView, seat: number): string {
  return seat === view.viewer ? 'You' : view.players[seat]?.name ?? '?';
}

/** One-line description of what the table is waiting for. */
export function statusLine(view: PlayerView): { text: string; mine: boolean } {
  const me = view.viewer;
  const name = (seat: number) => (seat === me ? 'You' : view.players[seat].name);
  if (view.phase === 'ended') return { text: view.winner !== null ? `${name(view.winner)} won the game!` : 'Game over', mine: false };
  // Prompts (e.g. a gold pick from a setup discovery) come before everything else, setup included.
  const mine = view.pending.find((p) => p.seat === me);
  if (mine) {
    const texts: Record<string, string> = {
      discard: `Discard ${'count' in mine ? mine.count : ''} cards`,
      robber: 'Move the robber: pick a hex',
      freeRoads: `Place ${'count' in mine ? mine.count : ''} free ${'count' in mine && mine.count === 1 ? (shipsInPlay(view) ? 'road or ship' : 'road') : shipsInPlay(view) ? 'roads or ships' : 'roads'}`,
      loseCity: 'The barbarians won: choose a city to lose',
      relocateKnight: 'Move your displaced knight',
      rewardDeck: 'Choose a progress card deck',
      aqueduct: 'Aqueduct: choose a resource',
      goldPick: `${mine.kind === 'goldPick' && mine.reason === 'treasure' ? 'Treasure' : 'Gold'}! Choose ${'count' in mine ? mine.count : ''} resource${'count' in mine && mine.count === 1 ? '' : 's'}`,
      discardProgress: 'Discard a progress card (max 4)',
      giveCards: 'Choose cards to give',
      commercialHarbor: 'Commercial Harbor: give a commodity',
      deserterRemove: 'Choose a knight to desert',
      deserterPlace: 'Place the deserted knight',
      moveRoad: 'Diplomat: pick where it goes',
      spy: 'Spy: take a progress card',
      masterMerchant: 'Master Merchant: take 2 cards',
      placeMetropolis: 'Place your metropolis on a city',
    };
    return { text: texts[mine.kind] ?? 'Your decision', mine: true };
  }
  if (view.pending.length) {
    // Say what everyone is waiting on, not just who: "Waiting for Ada to move the robber".
    const doing: Record<string, string> = {
      discard: 'discard',
      robber: 'move the robber',
      freeRoads: 'place free roads',
      loseCity: 'choose a city to lose',
      relocateKnight: 'move a displaced knight',
      rewardDeck: 'choose a progress card deck',
      aqueduct: 'pick an Aqueduct resource',
      goldPick: 'pick their resources',
      discardProgress: 'discard a progress card',
      giveCards: 'choose cards to give',
      commercialHarbor: 'answer the Commercial Harbor',
      deserterRemove: 'choose a knight to desert',
      deserterPlace: 'place the deserted knight',
      moveRoad: 'move a road (Diplomat)',
      spy: 'spy on progress cards',
      masterMerchant: 'take cards (Master Merchant)',
      placeMetropolis: 'place a metropolis',
    };
    const seats = [...new Set(view.pending.map((p) => p.seat))];
    const kinds = [...new Set(view.pending.map((p) => p.kind))];
    const what = kinds.length === 1 && doing[kinds[0]] ? ` to ${doing[kinds[0]]}` : '';
    return { text: `Waiting for ${seats.map(name).join(', ')}${what}…`, mine: false };
  }
  if (view.phase === 'setup' && view.setup) {
    const seat = view.setup.order[view.setup.index];
    const second = view.setup.index >= view.players.length;
    const what = view.setup.placing === 'road' ? (legalSetupShips(view).length ? 'a road or ship' : 'a road') : second ? (view.mode === 'ck' ? 'a city' : 'a second settlement') : 'a settlement';
    return seat === me ? { text: `Place ${what}`, mine: true } : { text: `${name(seat)} is placing ${what}…`, mine: false };
  }
  const seat = view.turn.seat;
  if (seat === me) return { text: view.turn.rolled ? 'Your turn: build, trade or end turn' : 'Your turn: roll the dice (press R)', mine: true };
  return { text: `${name(seat)}'s turn`, mine: false };
}
