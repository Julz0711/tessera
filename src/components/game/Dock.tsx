'use client';

import { ArrowLeftRight, BrickWall, Eye, Hammer, Hourglass, Landmark, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import {
  COSTS,
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
import { confirmBuild } from '@/client/interaction';
import { play } from '@/client/sound';
import { api } from '@/client/store';
import { buildMode, useUi } from '@/client/ui';
import { CityGlyph, KnightGlyph, RoadGlyph, SettlementGlyph } from '@/components/ui/Glyphs';
import { CardList } from './cards';
import { Hand } from './Hand';
import { TradePanel } from './TradePanel';

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  active,
  cost,
  primary,
  danger,
  hint,
  left,
  bankAnchor,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  cost?: PartialHand;
  primary?: boolean;
  danger?: boolean;
  hint?: string;
  /** Pieces left in the player's supply. */
  left?: number;
  /** Marks the button as the bank's spot on screen for flying cards (where the bank strip is hidden). */
  bankAnchor?: boolean;
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
      data-bank-anchor={bankAnchor ? '' : undefined}
      className={`btn group relative flex-col gap-0.5 px-2.5 py-1.5 text-[11px] sm:min-w-16 ${primary ? 'btn-primary' : active ? 'btn-primary' : danger ? 'btn-danger' : ''}`}
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

export function Dock({ view }: { view: PlayerView }) {
  const ui = useUi();
  const me = view.viewer;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as Element | null;
      if (el && typeof el.closest === 'function' && el.closest('input, textarea, select, [contenteditable="true"]')) return;
      // Esc closes an open build popup first, then any mode or panel.
      if (e.key === 'Escape') {
        if (ui.armed) ui.arm(null);
        else ui.reset();
      }
      // Enter builds a popup's only option (unless a focused button is taking the Enter itself).
      if (e.key === 'Enter' && ui.armed?.options.length === 1 && !el?.closest?.('button')) void confirmBuild();
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
  return (
    <div className="flex flex-col items-center gap-2">
      {ui.panel === 'trade' && <TradePanel view={view} />}
      <Hand view={view} />

      {/* actions */}
      <div className="glass flex flex-wrap items-center justify-center gap-1.5 p-1.5 sm:gap-2 sm:p-2">
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
        <ActionButton label="Bank" icon={<Landmark size={20} />} onClick={() => ui.setPanel('bank')} active={ui.panel === 'bank'} disabled={!canBuild} bankAnchor />
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
          danger
        />
      </div>
    </div>
  );
}
