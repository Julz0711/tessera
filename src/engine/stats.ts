/**
 * End-of-game stats: running totals folded in as events are emitted (see `recordStats`, called from
 * `emit()` in `state.ts`). The event log is capped at `LOG_LIMIT`, so these can't be derived from it
 * after the fact — they have to be accumulated live. Everything here is public information.
 */
import { emptyHand, handTotal } from './hand';
import { CARDS, type GameEvent, type GameState, type GameStats } from './types';

export function newStats(playerCount: number): GameStats {
  const zeros = () => Array<number>(playerCount).fill(0);
  return {
    dice: Array<number>(13).fill(0),
    produced: Array.from({ length: playerCount }, () => emptyHand()),
    otherGain: zeros(),
    stolen: zeros(),
    lost: zeros(),
    discarded: zeros(),
    bankTrades: zeros(),
    playerTrades: zeros(),
    devBought: zeros(),
    knightsPlayed: zeros(),
    progressPlayed: zeros(),
  };
}

/** Folds one just-emitted event into `s.stats`. Lazily initializes for games saved before this field existed. */
export function recordStats(s: GameState, ev: GameEvent): void {
  s.stats ??= newStats(s.players.length);
  const stats = s.stats;
  switch (ev.type) {
    case 'diceRolled': {
      const total = ev.dice.red + ev.dice.yellow;
      stats.dice[total]++;
      break;
    }
    case 'produced':
      ev.gains.forEach((gain, seat) => {
        const bucket = stats.produced[seat];
        if (!bucket) return;
        for (const c of CARDS) if (gain[c]) bucket[c] += gain[c]!;
      });
      break;
    case 'received':
      // Starting resources dealt during setup aren't "income" for stats purposes; everything else
      // (discovery, gold, year of plenty, aqueduct, master merchant, ...) counts.
      if (ev.reason !== 'setup') stats.otherGain[ev.seat] += handTotal(ev.cards);
      break;
    case 'monopoly':
      stats.otherGain[ev.seat] += ev.total;
      break;
    case 'stole':
      stats.stolen[ev.seat]++;
      stats.lost[ev.victim]++;
      break;
    case 'discarded':
      stats.discarded[ev.seat] += handTotal(ev.cards);
      break;
    case 'bankTrade':
      stats.bankTrades[ev.seat]++;
      break;
    case 'trade':
      stats.playerTrades[ev.seat]++;
      stats.playerTrades[ev.partner]++;
      break;
    case 'devBought':
      stats.devBought[ev.seat]++;
      break;
    case 'devPlayed':
      if (ev.card === 'knight') stats.knightsPlayed[ev.seat]++;
      break;
    case 'progressPlayed':
      stats.progressPlayed[ev.seat]++;
      break;
    default:
      break;
  }
}
