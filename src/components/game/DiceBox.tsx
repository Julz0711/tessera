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
export function DiceBox({ view, size = 60, compact = false }: { view: PlayerView; size?: number; compact?: boolean }) {
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
    <div className={`glass flex items-center ${compact ? 'h-11 w-28 justify-center gap-1.5 p-1' : 'gap-3 p-2.5'} ${canRoll ? 'attention' : ''}`}>
      {/* Compact and about to roll: the Roll button alone, the old roll is stale. */}
      {roll && !(compact && canRoll) && (
        <div
          className={`flex items-center gap-1.5 ${canRoll ? 'cursor-pointer' : ''}`}
          onClick={canRoll ? rollNow : undefined}
          aria-label={`Last roll: ${roll.dice.red + roll.dice.yellow}`}
          title={`Last roll: ${roll.dice.red + roll.dice.yellow}`}
        >
          <Die size={size} value={roll.dice.red} rollKey={roll.key} bg={ck ? '#d9483b' : '#f6eddb'} pip={ck ? '#fff7f0' : '#1f1a14'} />
          <Die size={size} value={roll.dice.yellow} rollKey={roll.key + 1} bg={ck ? '#f2c14e' : '#f6eddb'} />
          {roll.dice.event && <EventDie face={roll.dice.event} size={size} />}
        </div>
      )}
      {canRoll && (
        <button type="button" onClick={rollNow} className={`btn btn-primary ${compact ? 'h-full min-h-0! flex-1 gap-1.5 px-2 text-sm' : 'flex-col gap-0.5 px-4 py-2 text-xs'}`} title="Roll the dice (R)" aria-keyshortcuts="R">
          <Dices size={compact ? 20 : 24} />
          <span className="leading-none">
            Roll <Kbd k="R" />
          </span>
        </button>
      )}
    </div>
  );
}
