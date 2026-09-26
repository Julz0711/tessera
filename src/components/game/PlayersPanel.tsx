'use client';

import { Bot, Crown, Route, ShieldHalf, Swords, WifiOff } from 'lucide-react';
import { TRACKS, type Track } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { TRACK_STYLE } from '@/client/progressText';
import type { RoomDTO } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { Framed } from '@/components/profile/Cosmetics';
import { titleInfo } from '@/shared/cosmetics';
import { ReactionBubble } from './Reactions';

function Stat({ icon, value, title }: { icon: React.ReactNode; value: React.ReactNode; title: string }) {
  return (
    <span className="flex items-center gap-1 tabular" title={title}>
      {icon}
      {value}
    </span>
  );
}

type CardTone = 'hand' | 'dev' | 'progress';

const TONE_BG: Record<CardTone, string> = {
  hand: 'repeating-linear-gradient(135deg, #ecdfc4 0 2px, #dccaa6 2px 4px)',
  dev: '#1d5a6b',
  progress: `linear-gradient(90deg, ${TRACK_STYLE.trade.color} 0 34%, ${TRACK_STYLE.politics.color} 34% 67%, ${TRACK_STYLE.science.color} 67%)`,
};

/** A count shown as a little face-down card, like the cards in front of a player at the table. */
function CardCount({ tone, n, title }: { tone: CardTone; n: number; title: string }) {
  return (
    <span className="flex items-center gap-1 tabular" title={title}>
      <span className="h-3.75 w-2.75 rounded-[3px] border-[1.5px] border-ink" style={{ background: TONE_BG[tone] }} />
      {n}
    </span>
  );
}

/**
 * C&K city improvements at a glance: one column per track (trade, politics, science), filled from
 * the bottom. Levels 4–5, where metropolises are won, sit apart; a crown marks a metropolis held.
 */
export function ImprovementGrid({ levels, metropolis, compact = false }: { levels: Record<Track, number>; metropolis: Track[]; compact?: boolean }) {
  const cell = compact ? 'h-1.5 w-2' : 'h-2 w-2.5';
  const summary = TRACKS.map((t) => `${TRACK_STYLE[t].label} ${levels[t]}${metropolis.includes(t) ? ' (metropolis)' : ''}`).join(' · ');
  return (
    <div className="flex shrink-0 items-end gap-0.5" title={`City improvements: ${summary}`} aria-label={`City improvements: ${summary}`}>
      {TRACKS.map((t) => {
        const s = TRACK_STYLE[t];
        return (
          <div key={t} className="flex flex-col items-center gap-px">
            <Crown
              size={compact ? 9 : 11}
              strokeWidth={2.2}
              className={`text-ink ${metropolis.includes(t) ? '' : 'invisible'}`}
              style={{ fill: s.color }}
            />
            {[5, 4, 3, 2, 1].map((lvl) => {
              const on = lvl <= levels[t];
              return (
                <span
                  key={lvl}
                  className={`${cell} rounded-xs border ${lvl === 4 ? 'mb-0.5' : ''} ${on ? 'border-ink/70' : ''}`}
                  // Empty cells keep a pale tint of their track, so each column reads even at level 0.
                  style={on ? { background: s.color } : { background: `${s.color}2e`, borderColor: `${s.color}73` }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function PlayersPanel({
  view,
  room,
  compact = false,
  leading,
}: {
  view: PlayerView;
  room: RoomDTO | null;
  compact?: boolean;
  /** Extra tile shown before the players (e.g. the barbarian track on phones). */
  leading?: React.ReactNode;
}) {
  const actors = new Set(view.phase === 'setup' && view.setup ? [view.setup.order[view.setup.index]] : view.pending.length ? view.pending.map((p) => p.seat) : [view.turn.seat]);
  const ck = view.mode === 'ck';
  return (
    <ol className={compact ? 'scroll-thin flex gap-2 overflow-x-auto pb-1' : 'grid gap-2'}>
      {leading && <li className="flex shrink-0">{leading}</li>}
      {view.players.map((p, seat) => {
        const c = PLAYER_COLORS[p.color];
        const seatInfo = room?.seats[seat];
        const acting = actors.has(seat) && view.phase !== 'ended';
        const isTurn = view.turn.seat === seat && view.phase === 'play';
        const vp = p.vp ?? p.publicVP;
        return (
          <li
            key={p.id}
            className={`paper-flat relative flex shrink-0 items-center gap-2.5 p-2 pr-3 transition ${compact ? (ck ? 'min-w-56' : 'min-w-47.5') : ''} ${
              acting ? 'ring-4 ring-amber' : ''
            }`}
            style={{ boxShadow: `inset 5px 0 0 ${c.hex}` }}
          >
            <div className="relative" data-seat-anchor={seat}>
              {seatInfo ? (
                <Framed frame={seatInfo.cosmetics.frame} size={compact ? 40 : 48}>
                  {(s) => <KnightBadge knight={seatInfo.knight} color={p.color} size={s} />}
                </Framed>
              ) : (
                <div className="h-11 w-11 rounded-full" style={{ background: c.hex }} />
              )}
              {isTurn && <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 animate-ping rounded-full bg-amber" />}
              <ReactionBubble playerId={p.id} side={compact ? 'below' : 'left'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate font-extrabold leading-tight" title={seatInfo?.cosmetics.title ? titleInfo(seatInfo.cosmetics.title).name : undefined}>
                  {p.name}
                  {seat === view.viewer && <span className="ml-1 text-xs font-bold text-ink-faint">(you)</span>}
                </span>
                {p.isBot && <Bot size={13} className="shrink-0 text-ink-faint" />}
                {seatInfo && !seatInfo.isBot && !seatInfo.connected && <WifiOff size={13} className="shrink-0 text-terracotta" aria-label="Disconnected" />}
                {seatInfo?.autopilot && seatInfo.connected === false && <span className="text-[10px] font-bold text-terracotta">auto</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold text-ink-soft">
                <CardCount tone="hand" n={p.handCount} title="Cards in hand" />
                {ck ? (
                  <>
                    <CardCount tone="progress" n={p.progressCount} title="Progress cards" />
                    <Stat
                      icon={<ShieldHalf size={12} />}
                      value={view.knights.reduce((n, k) => n + (k && k.owner === seat && k.active ? k.level : 0), 0)}
                      title="Active knight strength"
                    />
                  </>
                ) : (
                  <>
                    <CardCount tone="dev" n={p.devCount} title="Development cards" />
                    <Stat icon={<Swords size={12} />} value={p.knightsPlayed} title="Knights played" />
                  </>
                )}
                <Stat icon={<Route size={12} />} value={p.roadLength} title="Longest road length" />
              </div>
              {(view.longestRoad === seat || view.largestArmy === seat) && (
                <div className="mt-1 flex gap-1">
                  {view.longestRoad === seat && <span className="rounded bg-amber px-1.5 text-[10px] font-black uppercase">Longest road</span>}
                  {view.largestArmy === seat && <span className="rounded bg-terracotta px-1.5 text-[10px] font-black uppercase text-white">Largest army</span>}
                </div>
              )}
            </div>
            {ck && <ImprovementGrid levels={p.improvements} metropolis={TRACKS.filter((t) => view.metropolis[t] === seat)} compact={compact} />}
            <div className="flex flex-col items-center">
              <span className="display text-2xl font-black leading-none tabular">{vp}</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-ink-faint">VP</span>
              {view.winner === seat && <Crown size={16} className="text-amber-deep" />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
