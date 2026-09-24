import { LARGEST_ARMY_MIN, LONGEST_ROAD_MIN } from '../constants';
import { longestRoadLength } from '../longestRoad';
import { emit, type Ctx } from '../state';
import { victoryPoints } from '../vp';

/**
 * Longest road: at least 5 segments. The holder keeps it on ties; if the holder is overtaken by
 * several tied players (e.g. after their road was cut), nobody holds it.
 */
export function updateLongestRoad(ctx: Ctx): void {
  const s = ctx.s;
  const lengths = s.players.map((_, seat) => longestRoadLength(s, ctx.topo, seat));
  s.roadLengths = lengths;
  const holder = s.longestRoad;
  const max = Math.max(...lengths);
  let next: number | null;
  if (max < LONGEST_ROAD_MIN) next = null;
  else if (holder !== null && lengths[holder] === max) next = holder;
  else {
    const leaders = lengths.flatMap((len, seat) => (len === max ? [seat] : []));
    next = leaders.length === 1 ? leaders[0] : null;
  }
  if (next !== holder) {
    s.longestRoad = next;
    emit(ctx, { type: 'longestRoad', seat: next, length: next === null ? 0 : lengths[next] });
  }
}

/** Largest army (classic): at least 3 knights and strictly more than the current holder. */
export function updateLargestArmy(ctx: Ctx, seat: number): void {
  const s = ctx.s;
  const knights = s.players[seat].knightsPlayed;
  if (knights < LARGEST_ARMY_MIN || s.largestArmy === seat) return;
  const holder = s.largestArmy;
  if (holder === null || knights > s.players[holder].knightsPlayed) {
    s.largestArmy = seat;
    emit(ctx, { type: 'largestArmy', seat, knights });
  }
}

/** A player wins by reaching the target during their own turn. */
export function checkWinner(ctx: Ctx): void {
  const s = ctx.s;
  if (s.phase !== 'play') return;
  const seat = s.turn.seat;
  if (victoryPoints(s, seat, true) >= s.settings.vpToWin) {
    s.phase = 'ended';
    s.winner = seat;
    s.pending = [];
    s.steps = [];
    s.trades = [];
    emit(ctx, { type: 'gameOver', winner: seat });
  }
}
