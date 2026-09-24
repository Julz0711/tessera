import { botAction } from '@/bots';
import type { Action, PlayerView } from '@/engine';

/**
 * Minimal moves made on behalf of an absent or timed-out human: resolve required decisions
 * sensibly, roll, and end the turn — never spend their cards on strategy.
 */
export function autopilotAction(view: PlayerView, seat: number): Action | null {
  const prompt = view.pending.find((p) => p.seat === seat);
  if (prompt) return botAction(view, seat);
  if (view.pending.length) return null;
  if (view.phase === 'setup') return botAction(view, seat);
  if (view.phase !== 'play' || view.turn.seat !== seat) return null;
  if (!view.turn.rolled) return { type: 'rollDice' };
  return { type: 'endTurn' };
}
