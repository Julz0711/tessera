'use client';

import { ArrowLeftRight, BrickWall, Eye, Hammer, Hourglass, Ship, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  COSTS,
  hasCards,
  legalCitySpots,
  legalKnightSpots,
  legalRoadSpots,
  legalSettlementSpots,
  legalShipSpots,
  piecesLeft,
  shipsInPlay,
  wallSpots,
  type PartialHand,
} from '@/engine';
import type { PlayerView } from '@/engine/view';
import { confirmBuild, confirmRobber } from '@/client/interaction';
import { play } from '@/client/sound';
import { api } from '@/client/store';
import { buildMode, useUi } from '@/client/ui';
import { CityGlyph, KnightGlyph, RoadGlyph, SettlementGlyph } from '@/components/ui/Glyphs';
import type { RoomDTO } from '@/shared/protocol';
import { Kbd } from '@/components/ui/Kbd';
import { CostDots } from './BuildCostsCard';
import { Hand } from './Hand';
import { TradePanel } from './TradePanel';
import { ImproveOptions, ProgressGrid, improvableCount } from './ck/ImproveMenu';

/** Seconds left until `deadline`, ticking every 250ms; null once there's no active deadline. */
export function useCountdown(deadline: number | null): number | null {
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
  count,
  buildToggle,
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
  /** How many options behind the button are open to you right now (the Build menu). */
  count?: number;
  /** The Build key: clicks on it don't count as clicking away from its menu. */
  buildToggle?: boolean;
  className?: string;
}) {
  const click = () => {
    play('click');
    onClick();
  };
  // The shortcut presses the button itself, so it only works while the button does.
  const latest = useRef(click);
  latest.current = click;
  useEffect(() => {
    if (!shortcut || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== shortcut.toLowerCase()) return;
      const el = e.target as Element | null;
      if (el && typeof el.closest === 'function' && el.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      latest.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut, disabled]);

  return (
    <button
      type="button"
      onClick={click}
      disabled={disabled}
      aria-pressed={active}
      aria-keyshortcuts={shortcut}
      title={shortcut ? `${hint ?? label} (${shortcut})` : (hint ?? label)}
      data-bank-anchor={bankAnchor ? '' : undefined}
      data-build-toggle={buildToggle ? '' : undefined}
      aria-haspopup={buildToggle ? 'menu' : undefined}
      className={`btn group relative min-w-0 flex-col gap-0.5 px-0 py-1.5 text-[10px] tracking-tight sm:size-22 sm:rounded-lg! sm:px-1 sm:py-1 sm:text-xs sm:tracking-normal ${primary ? 'btn-primary' : active ? 'btn-on' : danger ? 'btn-danger' : ''} ${pulse ? 'animate-pulse' : ''} ${className}`}
    >
      {shortcut && <Kbd k={shortcut} className="absolute left-1 top-1 text-[11px]" />}
      {/* A build you can't make is drawn in outline, but its cost dots stay: they show what's missing. */}
      <span className="flex flex-col items-center gap-0.5">
        {icon}
        <span className="whitespace-nowrap leading-none">{label}</span>
      </span>
      {cost && hand && <CostDots cost={cost} hand={hand} />}
      {count !== undefined && (
        <span className="hex-badge hex-badge-amber -right-1.5 -top-2" title={`${count} you can build now`}>
          {count}
        </span>
      )}
      {left !== undefined && (
        <span className="hex-badge hex-badge-ink -right-1.5 -top-2" title={`${left} left`}>
          {left}
        </span>
      )}
    </button>
  );
}

/**
 * `hand: false` leaves the hand and the trade panel out (wide screens give them their own corner, see
 * GameScreen); `timer: false` leaves the countdown off End turn (it sits above it instead, see TurnBar).
 */
export function Dock({ view, room, hand = true, timer = true }: { view: PlayerView; room: RoomDTO; hand?: boolean; timer?: boolean }) {
  const ui = useUi();
  const me = view.viewer;
  const seconds = useCountdown(room.deadline);
  const lowTime = seconds !== null && seconds <= 10;
  // The Build or Improve key's menu, opening upwards from the dock.
  const [open, setOpen] = useState<'build' | 'improve' | null>(null);
  const buildOpen = open === 'build';
  const setBuildOpen = (o: boolean) => setOpen(o ? 'build' : null);
  const menuRef = useRef<HTMLDivElement>(null);
  const improveRef = useRef<HTMLDivElement>(null);
  // A menu closes on Esc, on a click anywhere else, and when the turn moves on.
  useEffect(() => {
    if (!buildOpen) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!menuRef.current?.contains(t) && !improveRef.current?.contains(t) && !t?.closest?.('[data-build-toggle]')) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  useEffect(() => setOpen(null), [view.turn.n, view.turn.seat]);

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
  const cityOk = canBuild && left.cities > 0 && has(COSTS.city) && legalCitySpots(view, me).length > 0;
  const devOk = canBuild && !ck && view.devDeckCount > 0 && has(COSTS.devCard);
  const knightOk = canBuild && ck && left.knights[1] > 0 && has(COSTS.knight) && legalKnightSpots(view, me).length > 0;
  const wallOk = canBuild && ck && has(COSTS.wall) && wallSpots(view, me).length > 0;
  // Every build in one menu that opens upwards from the Build key. It stays mounted while closed,
  // so the builds' own shortcuts (1–4, S) keep working without opening it.
  const pick = (fn: () => void) => () => {
    fn();
    setBuildOpen(false);
  };
  const builds = [
    roadOk,
    voyage && shipOk,
    settlementOk,
    cityOk,
    !ck && devOk,
    ck && knightOk,
    ck && wallOk,
  ].filter(Boolean).length;
  return (
    <div className={`game-dock flex w-full min-w-0 flex-col items-center gap-2 sm:w-auto ${hand ? '' : 'h-full'}`}>
      {hand && ui.panel === 'trade' && <TradePanel view={view} />}
      {hand && <Hand view={view} />}

      <div role="group" aria-label="Game actions" className={`game-actions relative grid w-full ${hand ? '' : 'h-full'} auto-cols-fr grid-flow-col gap-1.5 sm:w-auto sm:gap-2`}>
        <div
          ref={menuRef}
          role="menu"
          aria-label="Build"
          className={`${buildOpen ? 'grid' : 'hidden'} glass animate-rise absolute bottom-full right-0 z-30 mb-2 w-max max-w-[calc(100vw-16px)] grid-flow-col gap-1.5 p-1.5 max-sm:grid-flow-row max-sm:grid-cols-4 sm:gap-2 sm:p-2`}
        >
          <ActionButton
            label="Road"
            shortcut="1"
            icon={<RoadGlyph size={24} />}
            onClick={pick(() => ui.toggleBuild('road'))}
            active={building === 'road'}
            disabled={!roadOk}
            cost={COSTS.road} hand={p.hand}
            left={left.roads}
          />
          {voyage && (
            <ActionButton
              label="Ship"
              shortcut="S"
              icon={<Ship size={24} />}
              onClick={pick(() => ui.toggleBuild('ship'))}
              active={building === 'ship'}
              disabled={!shipOk}
              cost={COSTS.ship} hand={p.hand}
              left={left.ships}
              hint="Build a ship on a sea or coast edge"
            />
          )}
          <ActionButton
            label="Settle"
            shortcut="2"
            icon={<SettlementGlyph size={24} />}
            onClick={pick(() => ui.toggleBuild('settlement'))}
            active={building === 'settlement'}
            disabled={!settlementOk}
            cost={COSTS.settlement} hand={p.hand}
            left={left.settlements}
          />
          <ActionButton
            label="City"
            shortcut="3"
            icon={<CityGlyph size={24} />}
            onClick={pick(() => ui.toggleBuild('city'))}
            active={building === 'city'}
            disabled={!cityOk}
            cost={COSTS.city} hand={p.hand}
            left={left.cities}
          />
          {!ck && <ActionButton label="Buy card" shortcut="4" icon={<Sparkles size={24} />} onClick={pick(() => void api.act({ type: 'buyDevCard' }))} disabled={!devOk} cost={COSTS.devCard} hand={p.hand} />}
          {ck && (
            <>
              <ActionButton
                label="Knight"
                shortcut="4"
                icon={<KnightGlyph size={24} />}
                onClick={pick(() => ui.toggleBuild('knight'))}
                active={building === 'knight'}
                disabled={!knightOk}
                cost={COSTS.knight} hand={p.hand}
                left={left.knights[1]}
                hint="Recruit a basic knight"
              />
              <ActionButton label="Wall" icon={<BrickWall size={24} />} onClick={pick(() => ui.toggleBuild('wall'))} active={building === 'wall'} disabled={!wallOk} cost={COSTS.wall} hand={p.hand} left={left.walls} hint="City wall: +2 hand limit" />
            </>
          )}
        </div>

        {ck && (
          <div
            ref={improveRef}
            role="menu"
            aria-label="Improve"
            className={`${open === 'improve' ? 'flex' : 'hidden'} glass animate-rise absolute bottom-full right-0 z-30 mb-2 w-max gap-1.5 p-1.5 sm:gap-2 sm:p-2`}
          >
            <ImproveOptions view={view} onDone={() => setOpen(null)} />
          </div>
        )}

        <ActionButton
          label="Build"
          shortcut="B"
          icon={<Hammer size={24} />}
          onClick={() => setOpen((o) => (o === 'build' ? null : 'build'))}
          active={buildOpen || building !== null}
          disabled={!canBuild}
          hint="Roads, settlements, cities and more"
          count={builds || undefined}
          buildToggle
        />
        {ck && (
          <ActionButton
            label="Improve"
            shortcut="I"
            icon={<ProgressGrid view={view} />}
            onClick={() => setOpen((o) => (o === 'improve' ? null : 'improve'))}
            active={open === 'improve'}
            disabled={view.phase !== 'play'}
            hint="City improvements"
            count={improvableCount(view) || undefined}
            buildToggle
          />
        )}
        <ActionButton
          label="Trade"
          shortcut="T"
          icon={<ArrowLeftRight size={24} />}
          onClick={() => ui.setPanel(ui.panel === 'trade' ? null : 'trade')}
          active={ui.panel === 'trade'}
          disabled={view.phase !== 'play' || !view.turn.rolled || !free}
          hint="Trade with the players or the bank"
          bankAnchor
        />
        <ActionButton
          label="End turn"
          icon={timer && seconds !== null ? <span className="font-mono text-base font-black leading-none tabular">{seconds}s</span> : <Hourglass size={24} />}
          onClick={() => {
            ui.reset();
            void api.act({ type: 'endTurn' });
          }}
          disabled={!canBuild}
          hint="End your turn"
          shortcut="E"
          danger
          pulse={timer && lowTime}
        />
      </div>
    </div>
  );
}
