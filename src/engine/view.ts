import { commodityTotal, emptyHand, handTotal, resourceTotal } from './hand';
import type { GameEvent, GameState, PlayerState, Prompt, Track } from './types';
import { publicVictoryPoints, victoryPoints } from './vp';

export interface PublicPlayer extends PlayerState {
  handCount: number;
  resourceCount: number;
  commodityCount: number;
  devCount: number;
  progressCount: number;
  /** Progress cards held per track: the backs show their colour, so this is public. */
  progressTracks: Record<Track, number>;
  publicVP: number;
  /** Full VP including hidden cards: own seat only (everyone once the game has ended). */
  vp: number | null;
  roadLength: number;
}

export interface PlayerView extends Omit<GameState, 'players' | 'devDeck' | 'progressDecks' | 'rng' | 'diceBag' | 'nextRoll'> {
  /** Seat of the viewer, or null for spectators. */
  viewer: number | null;
  players: PublicPlayer[];
  devDeckCount: number;
  progressDeckCounts: Record<Track, number>;
}

function redactEvent(ev: GameEvent, viewer: number | null, reveal: boolean): GameEvent {
  if (!ev.secret || reveal || (viewer !== null && ev.secretTo?.includes(viewer))) return ev;
  const { secret: _secret, secretTo: _to, ...rest } = ev;
  return rest as GameEvent;
}

function redactPrompt(p: Prompt, viewer: number | null): Prompt {
  if (p.seat === viewer) return p;
  if (p.kind === 'spy') return { ...p, cards: [] };
  if (p.kind === 'masterMerchant') return { ...p, hand: emptyHand() };
  return p;
}

/**
 * What `viewer` is allowed to know. Never includes the RNG state or deck order. `reveal` (on once the
 * game has ended) opens every hand, card and fogged hex; a replay passes it for every step.
 */
export function viewFor(state: GameState, viewer: number | null, reveal = state.phase === 'ended'): PlayerView {
  const players: PublicPlayer[] = state.players.map((p, seat) => {
    const own = seat === viewer || reveal;
    return {
      ...p,
      hand: own ? { ...p.hand } : emptyHand(),
      devCards: own ? p.devCards.map((c) => ({ ...c })) : [],
      progress: own ? p.progress.map((c) => ({ ...c })) : [],
      improvements: { ...p.improvements },
      handCount: handTotal(p.hand),
      resourceCount: resourceTotal(p.hand),
      commodityCount: commodityTotal(p.hand),
      devCount: p.devCards.length,
      progressCount: p.progress.length,
      progressTracks: {
        trade: p.progress.filter((c) => c.track === 'trade').length,
        politics: p.progress.filter((c) => c.track === 'politics').length,
        science: p.progress.filter((c) => c.track === 'science').length,
      },
      publicVP: publicVictoryPoints(state, seat),
      vp: own ? victoryPoints(state, seat) : null,
      roadLength: state.roadLengths[seat] ?? 0,
    };
  });
  const { devDeck, progressDecks, rng: _rng, diceBag: _diceBag, nextRoll: _nextRoll, players: _players, log, pending, stats, ...rest } = state;
  // While the game runs, the table only sees the dice (the rest would be a scouting report); at the end, everything.
  const publicStats = stats && { dice: stats.dice };
  const visible = { ...structuredClone(rest), stats: structuredClone(reveal ? stats : publicStats) as GameState['stats'] };
  // Old saves marked declines for lack of cards (`auto`); they count as no answer yet.
  for (const offer of visible.trades) {
    if (!offer.auto) continue;
    offer.declined = offer.declined.filter((seat) => !offer.auto!.includes(seat));
    delete offer.auto;
  }
  // Black Forest: what lies under the fog stays secret (a blank tile) until someone discovers it;
  // once the game is over the whole map is shown.
  visible.board.hexes = visible.board.hexes.map((h) => {
    if (!h.fog) return h;
    if (!reveal) return { id: h.id, q: h.q, r: h.r, terrain: 'desert', token: null, fog: true };
    const { fog: _fog, ...lifted } = h;
    return lifted;
  });
  // Veiled Isles: what a treasure holds stays secret until someone collects it.
  if (visible.board.treasures && !reveal) {
    visible.board.treasures = visible.board.treasures.map((t) => (t.takenBy === undefined ? { vertex: t.vertex, kind: null } : t));
  }
  // The draw pile behind hidden sea and desert is never shown.
  delete visible.board.treasurePile;
  return {
    ...visible,
    players,
    // Events are immutable once emitted; only redacted ones become new objects.
    log: log.map((ev) => redactEvent(ev, viewer, reveal)),
    pending: pending.map((p) => structuredClone(redactPrompt(p, viewer))),
    viewer,
    devDeckCount: devDeck.length,
    progressDeckCounts: {
      trade: progressDecks.trade.length,
      politics: progressDecks.politics.length,
      science: progressDecks.science.length,
    },
  };
}

/** Events redacted for one viewer (used when streaming the latest events for animations). */
export function eventsFor(events: GameEvent[], viewer: number | null, reveal = false): GameEvent[] {
  return events.map((ev) => redactEvent(ev, viewer, reveal));
}
