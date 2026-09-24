/** Progress card effects (Cities & Knights). Cards are played on your own turn, any number per turn. */
import { COSTS, TERRAIN_RESOURCE } from '../constants';
import { RuleError, assertRule } from '../errors';
import { commodityTotal, handTotal, resourceTotal } from '../hand';
import { isEdge, isHex, isVertex, legalRoadSpots, piecesLeft, topo } from '../queries';
import { isInt, requireActive } from '../rules/common';
import { upgradeToCity } from '../rules/build';
import { emit, type Ctx } from '../state';
import { COMMODITIES, isCard, isCommodity, isResource, type Card, type ProgressCard, type ProgressParams, type Resource } from '../types';
import { victoryPoints } from '../vp';
import { buildWallAt, displaceKnight, promoteKnightAt } from './pieces';
import {
  activatableKnights,
  intrigueTargets,
  inventorHexes,
  merchantHexes,
  openRoads,
  promotableKnights,
  robberActive,
  wallSpots,
} from './queries';

function takeCard(ctx: Ctx, id: number): ProgressCard {
  const p = ctx.s.players[ctx.seat];
  const i = p.progress.findIndex((c) => c.id === id);
  assertRule(i >= 0, "You don't have that card");
  return p.progress[i];
}

function discardPlayed(ctx: Ctx, card: ProgressCard): void {
  const p = ctx.s.players[ctx.seat];
  p.progress = p.progress.filter((c) => c.id !== card.id);
  ctx.s.progressDecks[card.track].push(card);
  emit(ctx, { type: 'progressPlayed', seat: ctx.seat, card: card.type });
}

/** Resources gained from every hex of a terrain touching the seat's buildings (each hex once). */
function harvest(ctx: Ctx, terrain: 'fields' | 'mountains', per: number): void {
  const s = ctx.s;
  const t = topo(s);
  const res = TERRAIN_RESOURCE[terrain]!;
  const hexes = s.board.hexes.filter((h) => h.terrain === terrain && t.hexes[h.id].vertices.some((v) => s.buildings[v]?.owner === ctx.seat));
  const amount = Math.min(s.bank[res], hexes.length * per);
  s.bank[res] -= amount;
  s.players[ctx.seat].hand[res] += amount;
  emit(ctx, { type: 'received', seat: ctx.seat, cards: { [res]: amount }, reason: terrain === 'fields' ? 'irrigation' : 'mining' });
}

function others(ctx: Ctx): number[] {
  return ctx.s.players.map((_, i) => i).filter((i) => i !== ctx.seat);
}

export function playProgress(ctx: Ctx, cardId: number, params: ProgressParams): void {
  requireActive(ctx);
  const s = ctx.s;
  const card = takeCard(ctx, cardId);
  const me = s.players[ctx.seat];

  if (card.type === 'alchemist') {
    assertRule(!s.turn.rolled, 'The Alchemist is played before rolling');
    assertRule(isInt(params.red, 1, 6) && isInt(params.yellow, 1, 6), 'Choose both dice');
    s.turn.alchemist = { red: params.red!, yellow: params.yellow! };
    return discardPlayed(ctx, card);
  }
  assertRule(s.turn.rolled, 'Roll the dice first');

  switch (card.type) {
    case 'crane':
      assertRule(!s.turn.crane, 'A Crane is already in effect');
      s.turn.crane = true;
      break;
    case 'engineer': {
      const v = params.vertex;
      assertRule(isVertex(s, v) && wallSpots(s, ctx.seat).includes(v), 'Pick one of your cities without a wall');
      discardPlayed(ctx, card);
      return buildWallAt(ctx, v, true);
    }
    case 'inventor': {
      const [a, b] = params.hexes ?? [];
      const allowed = inventorHexes(s);
      assertRule(isHex(s, a) && isHex(s, b) && a !== b && allowed.includes(a) && allowed.includes(b), 'Pick two number tokens (not 2, 12, 6 or 8)');
      const ta = s.board.hexes[a].token;
      s.board.hexes[a].token = s.board.hexes[b].token;
      s.board.hexes[b].token = ta;
      emit(ctx, { type: 'tokensSwapped', seat: ctx.seat, a, b });
      break;
    }
    case 'irrigation':
      discardPlayed(ctx, card);
      return harvest(ctx, 'fields', 2);
    case 'mining':
      discardPlayed(ctx, card);
      return harvest(ctx, 'mountains', 2);
    case 'medicine': {
      const v = params.vertex;
      assertRule(isVertex(s, v), 'Pick one of your settlements');
      discardPlayed(ctx, card);
      return upgradeToCity(ctx, v, COSTS.medicineCity);
    }
    case 'roadBuilding': {
      const left = piecesLeft(s, ctx.seat).roads;
      assertRule(left > 0 && legalRoadSpots(s, ctx.seat).length > 0, 'You have nowhere to build a road');
      s.pending.push({ kind: 'freeRoads', seat: ctx.seat, count: Math.min(2, left) });
      break;
    }
    case 'smith': {
      const picks = [...new Set(params.vertices ?? [])];
      assertRule(picks.length >= 1 && picks.length <= 2, 'Pick one or two knights to promote');
      const allowed = promotableKnights(s, ctx.seat);
      assertRule(picks.every((v) => allowed.includes(v)), 'Those knights cannot be promoted');
      discardPlayed(ctx, card);
      for (const v of picks) promoteKnightAt(ctx, v, true);
      return;
    }
    case 'bishop':
      assertRule(robberActive(s), 'The robber only appears after the first barbarian attack');
      s.pending.push({ kind: 'robber', seat: ctx.seat, reason: 'bishop' });
      break;
    case 'deserter': {
      const victim = params.victim;
      assertRule(isInt(victim, 0, s.players.length - 1) && victim !== ctx.seat, 'Pick an opponent');
      assertRule(s.knights.some((k) => k?.owner === victim), 'They have no knights');
      s.pending.push({ kind: 'deserterRemove', seat: victim!, to: ctx.seat });
      break;
    }
    case 'diplomat': {
      const e = params.edge;
      assertRule(isEdge(s, e) && openRoads(s).includes(e), 'Pick an open road (one end connected to nothing)');
      const owner = s.roads[e]!;
      s.roads[e] = null;
      emit(ctx, { type: 'roadRemoved', seat: ctx.seat, owner, at: e });
      // Moving one of your own roads: place it again right away.
      if (owner === ctx.seat && legalRoadSpots(s, ctx.seat).length) s.pending.push({ kind: 'freeRoads', seat: ctx.seat, count: 1 });
      break;
    }
    case 'intrigue': {
      const v = params.vertex;
      assertRule(isVertex(s, v) && intrigueTargets(s, ctx.seat).includes(v), 'Pick an opponent knight on one of your roads');
      const knight = s.knights[v]!;
      s.knights[v] = null;
      emit(ctx, { type: 'knightDisplaced', seat: ctx.seat, victim: knight.owner, at: v });
      discardPlayed(ctx, card);
      return displaceKnight(ctx, v, knight);
    }
    case 'saboteur': {
      const mine = victoryPoints(s, ctx.seat, false);
      for (const seat of others(ctx)) {
        const count = Math.floor(handTotal(s.players[seat].hand) / 2);
        if (count > 0 && victoryPoints(s, seat, false) >= mine) s.pending.push({ kind: 'discard', seat, count, reason: 'saboteur' });
      }
      break;
    }
    case 'spy': {
      const victim = params.victim;
      assertRule(isInt(victim, 0, s.players.length - 1) && victim !== ctx.seat, 'Pick an opponent');
      const cards = s.players[victim!].progress;
      assertRule(cards.length > 0, 'They have no progress cards');
      s.pending.push({ kind: 'spy', seat: ctx.seat, victim: victim!, cards: cards.map((c) => ({ ...c })) });
      break;
    }
    case 'warlord':
      for (const v of activatableKnights(s, ctx.seat)) {
        const k = s.knights[v]!;
        k.active = true;
        k.activatedOn = s.turn.n;
      }
      break;
    case 'wedding': {
      const mine = victoryPoints(s, ctx.seat, false);
      for (const seat of others(ctx)) {
        const count = Math.min(2, handTotal(s.players[seat].hand));
        if (count > 0 && victoryPoints(s, seat, false) > mine) s.pending.push({ kind: 'giveCards', seat, to: ctx.seat, count });
      }
      break;
    }
    case 'commercialHarbor': {
      const offers = params.offers ?? {};
      let traded = 0;
      for (const seat of others(ctx)) {
        const res = offers[seat];
        if (!res) continue;
        assertRule(isResource(res), 'Offer a resource');
        if (commodityTotal(s.players[seat].hand) === 0) continue;
        assertRule(me.hand[res] > 0, `You need a ${res} to offer`);
        me.hand[res]--;
        s.players[seat].hand[res]++;
        s.pending.push({ kind: 'commercialHarbor', seat, from: ctx.seat });
        traded++;
      }
      assertRule(traded > 0, 'Nobody you offered to has a commodity');
      break;
    }
    case 'masterMerchant': {
      const victim = params.victim;
      assertRule(isInt(victim, 0, s.players.length - 1) && victim !== ctx.seat, 'Pick an opponent');
      assertRule(victoryPoints(s, victim!, false) > victoryPoints(s, ctx.seat, false), 'Pick a player with more points than you');
      const hand = s.players[victim!].hand;
      const count = Math.min(2, handTotal(hand));
      assertRule(count > 0, 'They have no cards');
      s.pending.push({ kind: 'masterMerchant', seat: ctx.seat, victim: victim!, hand: { ...hand }, count });
      break;
    }
    case 'merchant': {
      const h = params.hex;
      assertRule(isHex(s, h) && merchantHexes(s, ctx.seat).includes(h), 'Place the merchant on a land hex next to your settlement or city');
      s.merchant = { hex: h, owner: ctx.seat };
      emit(ctx, { type: 'merchantPlaced', seat: ctx.seat, hex: h });
      break;
    }
    case 'merchantFleet': {
      const c = params.card;
      assertRule(isCard(c), 'Pick a resource or commodity');
      s.turn.merchantFleet.push(c as Card);
      break;
    }
    case 'resourceMonopoly': {
      const r = params.card;
      assertRule(isResource(r), 'Pick a resource');
      let total = 0;
      for (const seat of others(ctx)) {
        const n = Math.min(2, s.players[seat].hand[r as Resource]);
        s.players[seat].hand[r as Resource] -= n;
        me.hand[r as Resource] += n;
        total += n;
      }
      emit(ctx, { type: 'monopoly', seat: ctx.seat, card: r as Resource, total });
      break;
    }
    case 'tradeMonopoly': {
      const c = params.card;
      assertRule(isCommodity(c) && (COMMODITIES as readonly string[]).includes(c), 'Pick a commodity');
      let total = 0;
      for (const seat of others(ctx)) {
        if (s.players[seat].hand[c] > 0) {
          s.players[seat].hand[c]--;
          me.hand[c]++;
          total++;
        }
      }
      emit(ctx, { type: 'monopoly', seat: ctx.seat, card: c, total });
      break;
    }
    case 'printer':
    case 'constitution':
      throw new RuleError('Victory point cards count automatically');
    default:
      throw new RuleError('Unknown card');
  }
  discardPlayed(ctx, card);
}

