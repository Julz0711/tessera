'use client';

import { Dices } from 'lucide-react';
import { useMemo } from 'react';
import type { PlayerView } from '@/engine/view';
import { play } from '@/client/sound';
import { api } from '@/client/store';
import { Die, EventDie } from './Dice';
import { Kbd } from '@/components/ui/Kbd';

function lastRoll(view: PlayerView) {
  for (let i = view.log.length - 1; i >= 0; i--) {
    const ev = view.log[i];
    if (ev.type === 'diceRolled') return { dice: ev.dice, key: ev.seq };
  }
  return null;
}

/** Last roll + the Roll button, floated as its own HUD panel. Empty when there's nothing to show. */
export function DiceBox({
  view,
  size = 60,
  compact = false,
  bare = false,
  className = '',
}: {
  view: PlayerView;
  size?: number;
  compact?: boolean;
  /** Just the dice, no panel around them (above the dock). */
  bare?: boolean;
  className?: string;
}) {
  const roll = useMemo(() => lastRoll(view), [view]);
  const me = view.viewer;
  const canRoll = me !== null && view.phase === 'play' && view.turn.seat === me && !view.turn.rolled && view.pending.length === 0;

  if (!roll && !canRoll) return null;

  const ck = view.mode === 'ck';
  const rollNow = () => {
    play('click');
    void api.act({ type: 'rollDice' });
  };

  return (
    // Your turn and the dice still to roll: the box pulses like the "Your turn" pill up top.
    <div className={`flex items-center ${bare ? '' : 'glass'} ${className} ${compact ? 'h-11 w-28 justify-center gap-1.5 p-1' : bare ? 'gap-2 rounded-lg' : 'gap-3 p-2.5'} ${canRoll ? (bare ? 'animate-dice-call' : 'attention') : ''}`}>
      {/* Compact and about to roll: the Roll button alone, the old roll is stale. */}
      {!(compact && canRoll) && (
        // Wide screens have no Roll button: the dice themselves roll (and R, as the turn pill says).
        <div
          role={canRoll ? 'button' : undefined}
          tabIndex={canRoll ? 0 : undefined}
          className={`flex items-end gap-1.5 ${canRoll ? 'cursor-pointer' : ''}`}
          onClick={canRoll ? rollNow : undefined}
          onKeyDown={canRoll ? (e) => (e.key === 'Enter' || e.key === ' ') && rollNow() : undefined}
          aria-keyshortcuts={canRoll ? 'R' : undefined}
          aria-label={canRoll ? 'Roll the dice (R)' : roll ? `Last roll: ${roll.dice.red + roll.dice.yellow}` : undefined}
          title={canRoll ? 'Roll the dice (R)' : roll ? `Last roll: ${roll.dice.red + roll.dice.yellow}` : undefined}
        >
          {/* The event die is the odd one out: smaller, ahead of the number dice, on their baseline. */}
          {roll?.dice.event && <EventDie face={roll.dice.event} size={Math.round(size * 0.62)} />}
          {/* No roll yet this game: the dice wait face up, dimmed. */}
          <span className={`flex items-center gap-1.5 ${roll ? '' : 'opacity-60'}`}>
            <Die size={size} value={roll?.dice.red ?? 1} rollKey={roll?.key ?? 0} bg={ck ? '#d9483b' : '#ffffff'} pip={ck ? '#fff7f0' : '#131a1d'} />
            <Die size={size} value={roll?.dice.yellow ?? 1} rollKey={(roll?.key ?? 0) + 1} bg={ck ? '#f2c14e' : '#ffffff'} />
          </span>
        </div>
      )}
      {compact && canRoll && (
        <button type="button" onClick={rollNow} className="btn btn-primary h-full min-h-0! flex-1 gap-1.5 px-2 text-sm" title="Roll the dice (R)" aria-keyshortcuts="R">
          <Dices size={20} />
          <span className="leading-none">
            Roll <Kbd k="R" />
          </span>
        </button>
      )}
    </div>
  );
}
