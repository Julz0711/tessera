import type { Action, PlayerView } from '@/engine';
import { classicBotAction, type BotOptions } from './classic';

export type { BotOptions };

/** Next action for a bot-controlled seat, or null when it has nothing to do right now. */
export function botAction(view: PlayerView, seat: number, opts: BotOptions = {}): Action | null {
  return classicBotAction(view, seat, opts);
}
