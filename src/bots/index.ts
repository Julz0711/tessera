import type { Action, PlayerView } from '@/engine';
import { classicBotAction, type BotOptions } from './classic';
import { ckBotAction } from './ck';

export type { BotOptions };

/** Next action for a bot-controlled seat, or null when it has nothing to do right now. */
export function botAction(view: PlayerView, seat: number, opts: BotOptions = {}): Action | null {
  return view.mode === 'ck' ? ckBotAction(view, seat, opts) : classicBotAction(view, seat, opts);
}
