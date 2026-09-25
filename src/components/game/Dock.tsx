'use client';

import { ArrowLeftRight, BrickWall, Dices, Eye, Hammer, Hourglass, Landmark, ScrollText, Sparkles } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  COMMODITIES,
  COSTS,
  RESOURCES,
  hasCards,
  legalCitySpots,
  legalKnightSpots,
  legalRoadSpots,
  legalSettlementSpots,
  piecesLeft,
  wallSpots,
  type PartialHand,
} from '@/engine';
import type { PlayerView } from '@/engine/view';
import { play } from '@/client/sound';
import { api } from '@/client/store';
import { buildMode, useUi } from '@/client/ui';
import { CityGlyph, DevCardGlyph, KnightGlyph, RoadGlyph, SettlementGlyph } from '@/components/ui/Glyphs';
import { CardList, ResourceCard } from './cards';
import { Die, EventDie } from './Dice';

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  active,
  cost,
  primary,
  hint,
  left,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  cost?: PartialHand;
  primary?: boolean;
  hint?: string;
  /** Pieces left in the player's supply. */
  left?: number;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        play('click');
        onClick();
      }}
      disabled={disabled}
      aria-pressed={active}
      title={hint ?? label}
      className={`btn group relative flex-col gap-0.5 px-2.5 py-1.5 text-[11px] sm:min-w-16 ${primary ? 'btn-primary' : active ? 'btn-primary' : ''}`}
    >
      {icon}
      <span className="leading-none">{label}</span>
      {left !== undefined && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-paper px-1 text-[10px] font-black leading-none text-ink" title={`${left} left`}>
          {left}
        </span>
      )}
      {cost && (
        <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border-2 border-ink bg-paper px-2 py-1 group-hover:block">
          <CardList cards={cost} />
        </span>
      )}
    </button>
  );
}

function lastRoll(view: PlayerView) {
  for (let i = view.log.length - 1; i >= 0; i--) {
    const ev = view.log[i];
    if (ev.type === 'diceRolled') return { dice: ev.dice, key: ev.seq };
  }
  return null;
}

export function DiceTray({ view, size = 44 }: { view: PlayerView; size?: number }) {
  const roll = useMemo(() => lastRoll(view), [view]);
  if (!roll) return null;
  const ck = view.mode === 'ck';
  return (
    <div className="flex items-center gap-1.5" aria-label={`Last roll: ${roll.dice.red + roll.dice.yellow}`} title={`Last roll: ${roll.dice.red + roll.dice.yellow}`}>
      <Die size={size} value={roll.dice.red} rollKey={roll.key} bg={ck ? '#d9483b' : '#f6eddb'} pip={ck ? '#fff7f0' : '#1f1a14'} />
      <Die size={size} value={roll.dice.yellow} rollKey={roll.key + 1} bg={ck ? '#f2c14e' : '#f6eddb'} />
      {roll.dice.event && <EventDie face={roll.dice.event} size={size} />}
    </div>
  );
}

export function Dock({ view }: { view: PlayerView }) {
  const ui = useUi();
  const me = view.viewer;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as Element | null;
      if (el && typeof el.closest === 'function' && el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'Escape') ui.reset();
      if (me === null || view.phase !== 'play' || view.turn.seat !== me || view.pending.length) return;
      if (e.key.toLowerCase() === 'r' && !view.turn.rolled) void api.act({ type: 'rollDice' });
      if (e.key.toLowerCase() === 'e' && view.turn.rolled) void api.act({ type: 'endTurn' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui, me, view]);

  if (me === null) {
    return (
      <div className="glass flex items-center gap-2 px-4 py-3 text-sm font-bold text-foam/80">
        <Eye size={16} /> You are watching this game
      </div>
    );
  }

  const p = view.players[me];
  const ck = view.mode === 'ck';
  const myTurn = view.phase === 'play' && view.turn.seat === me;
  const free = view.pending.length === 0;
  const canBuild = myTurn && view.turn.rolled && free;
  const left = piecesLeft(view, me);
  const has = (c: PartialHand) => hasCards(p.hand, c);
  const building = buildMode(ui.mode);
  const roadOk = canBuild && left.roads > 0 && has(COSTS.road) && legalRoadSpots(view, me).length > 0;
  const settlementOk = canBuild && left.settlements > 0 && has(COSTS.settlement) && legalSettlementSpots(view, me).length > 0;
  const cityOk = canBuild && left.cities > 0 && has(COSTS.city) && legalCitySpots(view, me).length > 0;
  const devOk = canBuild && !ck && view.devDeckCount > 0 && has(COSTS.devCard);
  const knightOk = canBuild && ck && left.knights[1] > 0 && has(COSTS.knight) && legalKnightSpots(view, me).length > 0;
  const wallOk = canBuild && ck && has(COSTS.wall) && wallSpots(view, me).length > 0;
  const cards = ck ? [...RESOURCES, ...COMMODITIES] : RESOURCES;
  const devCount = ck ? p.progress.length : p.devCards.length;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* hand */}
      <div className="flex max-w-full items-end gap-1.5 overflow-x-auto px-3 pb-1 pt-3 scroll-thin sm:gap-2">
        {cards.map((c) => (
          <ResourceCard key={c} card={c} count={p.hand[c]} />
        ))}
        <button
          type="button"
          onClick={() => ui.setPanel(ck ? 'progress' : 'dev')}
          className="relative ml-1 flex h-18 w-13 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-ink bg-sea-600 text-paper transition hover:-translate-y-1 sm:h-20 sm:w-14"
          style={{ boxShadow: '0 3px 0 0 #1f1a14' }}
          title={ck ? 'Progress cards' : 'Development cards'}
        >
          {ck ? <ScrollText size={24} /> : <DevCardGlyph size={24} />}
          <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider">{ck ? 'Progress' : 'Dev'}</span>
          {devCount > 0 && (
            <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full border-2 border-ink bg-amber px-1 text-xs font-black text-ink">
              {devCount}
            </span>
          )}
        </button>
      </div>

      {/* actions */}
      <div className="glass flex flex-wrap items-center justify-center gap-1.5 p-1.5 sm:gap-2 sm:p-2">
        <div className="px-1">
          <DiceTray view={view} size={34} />
        </div>
        {myTurn && !view.turn.rolled && free ? (
          <ActionButton label="Roll (R)" icon={<Dices size={22} />} onClick={() => api.act({ type: 'rollDice' })} primary hint="Roll the dice (R)" />
        ) : null}
        <ActionButton
          label="Road"
          icon={<RoadGlyph size={20} />}
          onClick={() => ui.toggleBuild('road')}
          active={building === 'road'}
          disabled={!roadOk}
          cost={COSTS.road}
          left={left.roads}
        />
        <ActionButton
          label="Settle"
          icon={<SettlementGlyph size={20} />}
          onClick={() => ui.toggleBuild('settlement')}
          active={building === 'settlement'}
          disabled={!settlementOk}
          cost={COSTS.settlement}
          left={left.settlements}
        />
        <ActionButton
          label="City"
          icon={<CityGlyph size={20} />}
          onClick={() => ui.toggleBuild('city')}
          active={building === 'city'}
          disabled={!cityOk}
          cost={COSTS.city}
          left={left.cities}
        />
        {!ck && <ActionButton label="Buy card" icon={<Sparkles size={20} />} onClick={() => api.act({ type: 'buyDevCard' })} disabled={!devOk} cost={COSTS.devCard} />}
        {ck && (
          <>
            <ActionButton
              label="Knight"
              icon={<KnightGlyph size={20} />}
              onClick={() => ui.toggleBuild('knight')}
              active={building === 'knight'}
              disabled={!knightOk}
              cost={COSTS.knight}
              left={left.knights[1]}
              hint="Recruit a basic knight"
            />
            <ActionButton label="Wall" icon={<BrickWall size={20} />} onClick={() => ui.toggleBuild('wall')} active={building === 'wall'} disabled={!wallOk} cost={COSTS.wall} left={left.walls} hint="City wall: +2 hand limit" />
            <ActionButton label="Improve" icon={<Hammer size={20} />} onClick={() => ui.setPanel('improve')} active={ui.panel === 'improve'} disabled={view.phase !== 'play'} hint="City improvements" />
          </>
        )}
        <span className="mx-0.5 h-8 w-px bg-white/15" />
        <ActionButton
          label="Trade"
          icon={<ArrowLeftRight size={20} />}
          onClick={() => ui.setPanel('trade')}
          active={ui.panel === 'trade'}
          disabled={view.phase !== 'play' || !view.turn.rolled || !free}
        />
        <ActionButton label="Bank" icon={<Landmark size={20} />} onClick={() => ui.setPanel('bank')} active={ui.panel === 'bank'} disabled={!canBuild} />
        <span className="mx-0.5 h-8 w-px bg-white/15" />
        <ActionButton
          label="End (E)"
          icon={<Hourglass size={20} />}
          onClick={() => {
            ui.reset();
            void api.act({ type: 'endTurn' });
          }}
          disabled={!canBuild}
          hint="End your turn (E)"
        />
      </div>
    </div>
  );
}
