'use client';

import { ArrowLeftRight, BrickWall, Eye, Hammer, Hourglass, Landmark, Sailboat, ScrollText, Ship, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  COSTS,
  hasCards,
  legalCitySpots,
  legalKnightSpots,
  legalRoadSpots,
  legalSettlementSpots,
  legalShipSpots,
  piecesLeft,
  sailableShips,
  shipsInPlay,
  wallSpots,
  type Card,
  type PartialHand,
} from '@/engine';
import type { PlayerView } from '@/engine/view';
import { confirmBuild, confirmRobber } from '@/client/interaction';
import { play } from '@/client/sound';
import { api } from '@/client/store';
import { buildMode, useUi } from '@/client/ui';
import { CityGlyph, KnightGlyph, RoadGlyph, SettlementGlyph } from '@/components/ui/Glyphs';
import type { RoomDTO } from '@/shared/protocol';
import { CARD_COLORS } from '@/client/palette';
import { MiniArt } from './cardArt';
import { Hand } from './Hand';
import { TradePanel } from './TradePanel';

/** Seconds left until `deadline`, ticking every 250ms; null once there's no active deadline. */
function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline]);
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  active,
  cost,
  hand,
  primary,
  danger,
  pulse,
  hint,
  className = '',
  shortcut,
  left,
  bankAnchor,
}: {
  label: string;
  /** Keyboard key, shown after the label where there's a keyboard to press it on. */
  shortcut?: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  cost?: PartialHand;
  /** The player's hand, to fade the cost's cards they don't have enough of. */
  hand?: PartialHand;
  primary?: boolean;
  danger?: boolean;
  /** Draws attention to the button (e.g. the turn timer running low). */
  pulse?: boolean;
  hint?: string;
  /** Pieces left in the player's supply. */
  left?: number;
  /** Marks the button as the bank's spot on screen for flying cards (where the bank strip is hidden). */
  bankAnchor?: boolean;
  className?: string;
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
      className={`btn group relative min-w-0 flex-col gap-0.5 px-0 py-1.5 ${cost ? 'disabled:bg-paper/50 disabled:opacity-100' : ''} text-[10px] tracking-tight sm:min-w-16 sm:px-2.5 sm:text-[11px] sm:tracking-normal ${primary ? 'btn-primary' : active ? 'btn-primary' : danger ? 'btn-danger' : ''} ${pulse ? 'animate-pulse' : ''} ${className}`}
    >
      {/* A build you can't make fades its icon and label, but not its cost bubble. */}
      <span className={`flex flex-col items-center gap-0.5 ${cost ? 'group-disabled:opacity-45' : ''}`}>
        {icon}
        <span className="whitespace-nowrap leading-none">
          {label}
          {shortcut && <span className="pointer-coarse:hidden"> ({shortcut})</span>}
        </span>
      </span>
      {left !== undefined && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-paper px-1 text-[10px] font-black leading-none text-ink" title={`${left} left`}>
          {left}
        </span>
      )}
      {cost && (
        // What it costs, on hover (with a mouse); touch screens have the building-costs sheet.
        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2.5 hidden -translate-x-1/2 rounded-lg border-2 border-ink bg-paper px-2 py-1.5 shadow-lg group-hover:flex">
          <CostPips cost={cost} hand={hand} />
        </span>
      )}
    </button>
  );
}

/**
 * What a build costs: a chip per card kind with its count. Kinds the hand can't cover yet are
 * faded, so what's missing stands out.
 */
function CostPips({ cost, hand }: { cost: PartialHand; hand?: PartialHand }) {
  const entries = (Object.entries(cost) as [Card, number][]).filter(([, n]) => n > 0);
  const label = entries.map(([c, n]) => `${n} ${CARD_COLORS[c].label}`).join(', ');
  return (
    <span className="flex items-center justify-center gap-1.5" aria-label={`Costs ${label}`} title={`Costs ${label}`}>
      {entries.map(([c, n]) => {
        const short = hand !== undefined && (hand[c] ?? 0) < n;
        return (
          <span
            key={c}
            className={`relative grid h-6 min-w-6 place-items-center rounded border border-black/40 ${short ? 'opacity-30 grayscale' : ''}`}
            style={{ background: CARD_COLORS[c].bg }}
          >
            <MiniArt card={c} size={18} />
            {n > 1 && (
              <span className="absolute -bottom-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full border border-paper bg-ink px-0.5 text-[10px] font-black leading-none text-paper">
                {n}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/**
 * The building-costs sheet (touch screens, where there's no hover): every build with its cost and
 * what it scores, like the cheat sheet each player gets with the board game. A reference card, so
 * nothing on it fades with the hand (the hover bubble does that).
 */
function BuildCosts({ view, onClose }: { view: PlayerView; onClose: () => void }) {
  const ck = view.mode === 'ck';
  const rows: { label: string; icon: React.ReactNode; cost: PartialHand; vp?: string }[] = [
    { label: 'Road', icon: <RoadGlyph size={18} />, cost: COSTS.road, vp: '0 VP' },
    ...(shipsInPlay(view) ? [{ label: 'Ship', icon: <Ship size={18} />, cost: COSTS.ship, vp: '0 VP' }] : []),
    { label: 'Settlement', icon: <SettlementGlyph size={18} />, cost: COSTS.settlement, vp: '1 VP' },
    { label: 'City', icon: <CityGlyph size={18} />, cost: COSTS.city, vp: '2 VP' },
    ...(ck
      ? [
          { label: 'Knight', icon: <KnightGlyph size={18} />, cost: COSTS.knight },
          { label: 'Promote knight', icon: <KnightGlyph size={18} />, cost: COSTS.promote },
          { label: 'Activate knight', icon: <KnightGlyph size={18} />, cost: COSTS.activate },
          { label: 'City wall', icon: <BrickWall size={18} />, cost: COSTS.wall },
        ]
      : [{ label: 'Development card', icon: <Sparkles size={18} />, cost: COSTS.devCard, vp: '? VP' }]),
  ];
  return (
    <div className="relative w-full max-w-sm rounded-xl border-2 border-ink bg-paper p-3 text-ink shadow-lg" role="dialog" aria-label="Building costs">
      <button type="button" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full hover:bg-ink/10" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
      <h2 className="display mb-2 text-center text-base font-black uppercase tracking-wide">Building costs</h2>
      <ul className="divide-y divide-ink/15">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 py-1.5">
            <span className="grid w-5 shrink-0 place-items-center">{r.icon}</span>
            <span className="min-w-0 flex-1 text-sm font-extrabold leading-tight">{r.label}</span>
            <CostPips cost={r.cost} />
            {r.vp !== undefined && <span className="w-9 shrink-0 text-right text-[11px] font-black text-ink/60">{r.vp}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-snug text-ink/70">
        A city replaces one of your settlements.{' '}
        {ck ? 'Each city wall lets you hold 2 more cards when a 7 is rolled.' : 'Play one development card a turn, not on the turn you buy it.'}
      </p>
    </div>
  );
}

export function Dock({ view, room }: { view: PlayerView; room: RoomDTO }) {
  const ui = useUi();
  const me = view.viewer;
  const seconds = useCountdown(room.deadline);
  const lowTime = seconds !== null && seconds <= 10;
  const [costsOpen, setCostsOpen] = useState(false);
  // The sheet makes way once a build, a panel or a card takes over.
  useEffect(() => {
    if (ui.mode || ui.panel || ui.card) setCostsOpen(false);
  }, [ui.mode, ui.panel, ui.card]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as Element | null;
      if (el && typeof el.closest === 'function' && el.closest('input, textarea, select, [contenteditable="true"]')) return;
      // Esc closes an open popup (a build or the robber's) first, then any mode or panel.
      if (e.key === 'Escape') {
        if (ui.armed) ui.arm(null);
        else if (ui.robber) ui.setRobber(null);
        else ui.reset();
      }
      // Enter takes a popup's only option (unless a focused button is taking the Enter itself).
      if (e.key === 'Enter' && !el?.closest?.('button')) {
        if (ui.armed?.options.length === 1) void confirmBuild();
        else if (ui.robber) void confirmRobber(view);
      }
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
  const voyage = shipsInPlay(view);
  const shipOk = canBuild && left.ships > 0 && has(COSTS.ship) && legalShipSpots(view, me).length > 0;
  const sailOk = canBuild && sailableShips(view, me).length > 0;
  const cityOk = canBuild && left.cities > 0 && has(COSTS.city) && legalCitySpots(view, me).length > 0;
  const devOk = canBuild && !ck && view.devDeckCount > 0 && has(COSTS.devCard);
  const knightOk = canBuild && ck && left.knights[1] > 0 && has(COSTS.knight) && legalKnightSpots(view, me).length > 0;
  const wallOk = canBuild && ck && has(COSTS.wall) && wallSpots(view, me).length > 0;
  return (
    <div className="game-dock flex w-full min-w-0 flex-col items-center gap-2 sm:w-auto">
      {ui.panel === 'trade' && <TradePanel view={view} />}
      {costsOpen && <BuildCosts view={view} onClose={() => setCostsOpen(false)} />}
      <Hand view={view} />

      {/* actions: one row where there's room; on phones the builds and the turn's other moves
          get a row each, every button the same width, so nothing hides off the edge. */}
      <div role="group" aria-label="Game actions" className="game-actions glass flex w-full flex-col gap-1.5 p-1.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-2 sm:p-2">
        <div className="grid auto-cols-fr grid-flow-col gap-1 sm:flex sm:gap-2">
          <ActionButton
            label="Road"
            icon={<RoadGlyph size={20} />}
            onClick={() => ui.toggleBuild('road')}
            active={building === 'road'}
            disabled={!roadOk}
            cost={COSTS.road} hand={p.hand}
            left={left.roads}
          />
          {voyage && (
            <>
              <ActionButton
                label="Ship"
                icon={<Ship size={20} />}
                onClick={() => ui.toggleBuild('ship')}
                active={building === 'ship'}
                disabled={!shipOk}
                cost={COSTS.ship} hand={p.hand}
                left={left.ships}
                hint="Build a ship on a sea or coast edge"
              />
              <ActionButton
                label="Sail"
                icon={<Sailboat size={20} />}
                onClick={() => ui.setMode(ui.mode?.t === 'shipMove' ? null : { t: 'shipMove', from: null })}
                active={ui.mode?.t === 'shipMove'}
                disabled={!sailOk}
                hint="Move the ship at the open end of a route (once a turn)"
              />
            </>
          )}
          <ActionButton
            label="Settle"
            icon={<SettlementGlyph size={20} />}
            onClick={() => ui.toggleBuild('settlement')}
            active={building === 'settlement'}
            disabled={!settlementOk}
            cost={COSTS.settlement} hand={p.hand}
            left={left.settlements}
          />
          <ActionButton
            label="City"
            icon={<CityGlyph size={20} />}
            onClick={() => ui.toggleBuild('city')}
            active={building === 'city'}
            disabled={!cityOk}
            cost={COSTS.city} hand={p.hand}
            left={left.cities}
          />
          {!ck && <ActionButton label="Buy card" icon={<Sparkles size={20} />} onClick={() => api.act({ type: 'buyDevCard' })} disabled={!devOk} cost={COSTS.devCard} hand={p.hand} />}
          {ck && (
            <>
              <ActionButton
                label="Knight"
                icon={<KnightGlyph size={20} />}
                onClick={() => ui.toggleBuild('knight')}
                active={building === 'knight'}
                disabled={!knightOk}
                cost={COSTS.knight} hand={p.hand}
                left={left.knights[1]}
                hint="Recruit a basic knight"
              />
              <ActionButton label="Wall" icon={<BrickWall size={20} />} onClick={() => ui.toggleBuild('wall')} active={building === 'wall'} disabled={!wallOk} cost={COSTS.wall} hand={p.hand} left={left.walls} hint="City wall: +2 hand limit" />
              <ActionButton label="Improve" icon={<Hammer size={20} />} onClick={() => ui.setPanel('improve')} active={ui.panel === 'improve'} disabled={view.phase !== 'play'} hint="City improvements" className="max-sm:hidden" />
            </>
          )}
        </div>
        <span className="mx-0.5 hidden h-8 w-px bg-white/15 sm:block" />
        <div className="grid auto-cols-fr grid-flow-col gap-1.5 sm:flex sm:items-center sm:gap-2">
          {/* phones: Improve rides with the turn's other moves, keeping the build row short */}
          {ck && <ActionButton label="Improve" icon={<Hammer size={20} />} onClick={() => ui.setPanel('improve')} active={ui.panel === 'improve'} disabled={view.phase !== 'play'} hint="City improvements" className="sm:hidden" />}
          {/* touch screens: no hover to show a build's cost, so the building-costs sheet instead */}
          <ActionButton label="Costs" icon={<ScrollText size={20} />} onClick={() => setCostsOpen((o) => !o)} active={costsOpen} hint="Building costs" className="pointer-fine:hidden" />
          <ActionButton
            label="Trade"
            icon={<ArrowLeftRight size={20} />}
            onClick={() => ui.setPanel('trade')}
            active={ui.panel === 'trade'}
            disabled={view.phase !== 'play' || !view.turn.rolled || !free}
          />
          <ActionButton label="Bank" icon={<Landmark size={20} />} onClick={() => ui.setPanel('bank')} active={ui.panel === 'bank'} disabled={!canBuild} bankAnchor />
          <span className="mx-0.5 hidden h-8 w-px bg-white/15 sm:block" />
          <ActionButton
            label="End turn"
            icon={seconds !== null ? <span className="font-mono text-base font-black leading-none tabular">{seconds}s</span> : <Hourglass size={20} />}
            onClick={() => {
              ui.reset();
              void api.act({ type: 'endTurn' });
            }}
            disabled={!canBuild}
            hint="End your turn (E)"
            shortcut="E"
            danger
            pulse={lowTime}
          />
        </div>
      </div>
    </div>
  );
}
