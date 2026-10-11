'use client';

import { ArrowUpCircle, Footprints, Power, ShieldAlert } from 'lucide-react';
import { COSTS, canKnightAct, chasePirateKnights, chaseRobberKnights, hasCards, knightMoveTargets, promotableKnights } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { Modal } from '@/components/ui/Modal';
import { CardList } from '../cards';

const LEVEL_NAME = ['', 'Basic', 'Strong', 'Mighty'];

/** Actions for one of your knights (opened by clicking it on the board). */
export function KnightMenu({ view, vertex }: { view: PlayerView; vertex: number }) {
  const ui = useUi();
  const me = view.viewer!;
  const knight = view.knights[vertex];
  if (!knight || knight.owner !== me) return null;
  const hand = view.players[me].hand;
  const myTurn = view.turn.seat === me && view.turn.rolled && view.pending.length === 0;
  const acts = canKnightAct(view, me, vertex);
  const targets = knightMoveTargets(view, me, vertex);
  const canMove = myTurn && acts && targets.moves.length + targets.displaces.length > 0;
  // Why the move is greyed out, when the note above doesn't already say it.
  const moveBlocked =
    view.turn.seat !== me
      ? 'Knights act on your own turn.'
      : !view.turn.rolled
        ? 'Roll the dice first.'
        : acts && !canMove && view.pending.length === 0
          ? 'No free corner along your roads to move to, and no weaker rival knight to displace. Build a road on from here.'
          : null;
  const besideRobber = chaseRobberKnights(view, me).includes(vertex);
  const besidePirate = chasePirateKnights(view, me).includes(vertex);
  const canChase = myTurn && (besideRobber || besidePirate);
  const chaseLabel = besideRobber && besidePirate ? 'Chase the robber or pirate away' : besidePirate ? 'Chase the pirate away' : 'Chase the robber away';
  const canPromote = myTurn && promotableKnights(view, me).includes(vertex) && hasCards(hand, COSTS.promote);
  const canActivate = myTurn && !knight.active && hasCards(hand, COSTS.activate);
  const close = () => ui.setKnightMenu(null);
  const run = async (action: Parameters<typeof api.act>[0]) => {
    const r = await api.act(action);
    if (r.ok) close();
  };

  return (
    <Modal open onClose={close} title={`${LEVEL_NAME[knight.level]} knight`}>
      <p className="mb-3 text-sm text-ink-soft">
        {knight.active
          ? acts
            ? 'Ready for action: move, displace a weaker knight, or chase the robber or pirate.'
            : 'Activated this turn, it can act from your next turn.'
          : 'Inactive. Activate it to defend against the barbarians and to act.'}
      </p>
      <div className="grid gap-2">
        {!knight.active && (
          <button type="button" className="btn justify-between px-4 py-2.5" disabled={!canActivate} onClick={() => run({ type: 'activateKnight', vertex })}>
            <span className="flex items-center gap-2">
              <Power size={16} /> Activate
            </span>
            <CardList cards={COSTS.activate} />
          </button>
        )}
        {knight.level < 3 && (
          <button type="button" className="btn justify-between px-4 py-2.5" disabled={!canPromote} onClick={() => run({ type: 'promoteKnight', vertex })}>
            <span className="flex items-center gap-2">
              <ArrowUpCircle size={16} /> Promote to {LEVEL_NAME[knight.level + 1]}
            </span>
            <CardList cards={COSTS.promote} />
          </button>
        )}
        <button
          type="button"
          className="btn justify-start px-4 py-2.5"
          disabled={!canMove}
          onClick={() => ui.setMode({ t: 'knightMove', from: vertex })}
        >
          <Footprints size={16} /> Move or displace
        </button>
        {moveBlocked && knight.active && <p className="-mt-1 px-1 text-xs text-ink-faint">{moveBlocked}</p>}
        <button type="button" className="btn justify-start px-4 py-2.5" disabled={!canChase} onClick={() => ui.setMode({ t: 'knightChase', from: vertex })}>
          <ShieldAlert size={16} /> {chaseLabel}
        </button>
      </div>
      {knight.level === 2 && !promotableKnights(view, me).includes(vertex) && view.players[me].improvements.politics < 3 && (
        <p className="mt-3 text-xs text-ink-faint">Mighty knights need a Fortress (Politics level 3).</p>
      )}
    </Modal>
  );
}
