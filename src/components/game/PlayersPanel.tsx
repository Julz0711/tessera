'use client';

import { Bot, Crown, Layers, Route, ShieldHalf, Sparkles, Swords, WifiOff } from 'lucide-react';
import type { PlayerView } from '@/engine/view';
import type { RoomDTO } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightBadge } from '@/components/knight/KnightBadge';

function Stat({ icon, value, title }: { icon: React.ReactNode; value: React.ReactNode; title: string }) {
  return (
    <span className="flex items-center gap-1 tabular" title={title}>
      {icon}
      {value}
    </span>
  );
}

export function PlayersPanel({ view, room, compact = false }: { view: PlayerView; room: RoomDTO | null; compact?: boolean }) {
  const actors = new Set(view.phase === 'setup' && view.setup ? [view.setup.order[view.setup.index]] : view.pending.length ? view.pending.map((p) => p.seat) : [view.turn.seat]);
  return (
    <ol className={compact ? 'scroll-thin flex gap-2 overflow-x-auto pb-1' : 'grid gap-2'}>
      {view.players.map((p, seat) => {
        const c = PLAYER_COLORS[p.color];
        const seatInfo = room?.seats[seat];
        const acting = actors.has(seat) && view.phase !== 'ended';
        const isTurn = view.turn.seat === seat && view.phase === 'play';
        const vp = p.vp ?? p.publicVP;
        return (
          <li
            key={p.id}
            className={`paper-flat relative flex shrink-0 items-center gap-2.5 p-2 pr-3 transition ${compact ? 'min-w-47.5' : ''} ${
              acting ? 'ring-4 ring-amber' : ''
            }`}
            style={{ boxShadow: `inset 5px 0 0 ${c.hex}` }}
          >
            <div className="relative">
              {seatInfo ? <KnightBadge knight={seatInfo.knight} color={p.color} size={compact ? 38 : 44} /> : <div className="h-11 w-11 rounded-full" style={{ background: c.hex }} />}
              {isTurn && <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 animate-ping rounded-full bg-amber" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate font-extrabold leading-tight">
                  {p.name}
                  {seat === view.viewer && <span className="ml-1 text-xs font-bold text-ink-faint">(you)</span>}
                </span>
                {p.isBot && <Bot size={13} className="shrink-0 text-ink-faint" />}
                {seatInfo && !seatInfo.isBot && !seatInfo.connected && <WifiOff size={13} className="shrink-0 text-terracotta" aria-label="Disconnected" />}
                {seatInfo?.autopilot && seatInfo.connected === false && <span className="text-[10px] font-bold text-terracotta">auto</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs font-bold text-ink-soft">
                <Stat icon={<Layers size={12} />} value={p.handCount} title="Cards in hand" />
                {view.mode === 'classic' ? (
                  <>
                    <Stat icon={<Sparkles size={12} />} value={p.devCount} title="Development cards" />
                    <Stat icon={<Swords size={12} />} value={p.knightsPlayed} title="Knights played" />
                  </>
                ) : (
                  <>
                    <Stat icon={<Sparkles size={12} />} value={p.progressCount} title="Progress cards" />
                    <Stat
                      icon={<ShieldHalf size={12} />}
                      value={view.knights.reduce((n, k) => n + (k && k.owner === seat && k.active ? k.level : 0), 0)}
                      title="Active knight strength"
                    />
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
              {view.mode === 'ck' && (
                <div className="mt-1 flex gap-1" title="City improvements: trade / politics / science">
                  {(['trade', 'politics', 'science'] as const).map((t) => (
                    <span key={t} className="flex gap-px">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-2 rounded-sm"
                          style={{
                            background: i < p.improvements[t] ? { trade: '#e9c35a', politics: '#3a74d8', science: '#3f9b4f' }[t] : '#00000018',
                          }}
                        />
                      ))}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
