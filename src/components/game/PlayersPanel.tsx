'use client';

import { Ban, Bot, Crown, Route, ShieldHalf, Store, Swords, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/client/store';
import { TRACKS, handLimit, type Track } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { TRACK_STYLE } from '@/client/progressText';
import type { RoomDTO } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { Framed } from '@/components/profile/Cosmetics';
import { titleInfo } from '@/shared/cosmetics';
import { ReactionBubble } from './Reactions';
import { Modal } from '@/components/ui/Modal';

/** A number beside its icon; `award` tints it when the player holds that award (Longest road, Largest army). */
function Stat({ icon, value, title, award }: { icon: React.ReactNode; value: React.ReactNode; title: string; award?: string }) {
  return (
    <span className={`flex items-center justify-between gap-0.5 rounded-md px-0.5 tabular ${award ?? ''}`} title={title}>
      {icon}
      {value}
    </span>
  );
}

function CardBack({ bg }: { bg: string }) {
  return <span className="h-3.75 w-2.75 shrink-0 rounded-[3px] border-[1.5px] border-ink" style={{ background: bg }} />;
}

/** A face-down card at the table with its count in a badge, as on colonist. */
function CardIcon({
  bg,
  ink = '#f6eddb',
  n,
  title,
  glyph = '?',
  small,
  warn,
}: {
  bg: string;
  ink?: string;
  n: number;
  title: string;
  glyph?: React.ReactNode;
  small?: boolean;
  /** Shown in red, with this explanation added to the tooltip. */
  warn?: string;
}) {
  const label = `${title}: ${n}${warn ? ` (${warn})` : ''}`;
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-md border-2 border-ink font-black shadow-[0_2px_0_0_#1f1a14] ${small ? 'h-7.5 w-5 text-[11px]' : 'h-9 w-6.5 text-sm'} ${n ? '' : 'opacity-45'}`}
      style={{ background: warn ? WARN_BG : bg, color: warn ? '#5a1510' : ink }}
      title={label}
      aria-label={label}
    >
      {glyph}
      <span
        className={`hex-badge -right-2 -top-2.5 w-4.5 tabular ${warn ? 'hex-badge-warn' : ''}`}
      >
        {n}
      </span>
    </span>
  );
}

const HAND_BG = 'repeating-linear-gradient(135deg, #ecdfc4 0 3px, #dccaa6 3px 6px)';
/** A hand over the limit: a 7 now would cost that player half their cards. */
const WARN_BG = 'repeating-linear-gradient(135deg, #f3b1a8 0 3px, #e5897d 3px 6px)';
const DEV_BG = '#1d5a6b';

/** Progress cards per track, the way their coloured backs show at the table (what a Spy would find). */
export function ProgressCounts({ tracks }: { tracks: Record<Track, number> }) {
  const summary = TRACKS.map((t) => `${TRACK_STYLE[t].label} ${tracks[t]}`).join(' · ');
  return (
    <span className="flex items-center gap-1.5 tabular" title={`Progress cards: ${summary}`} aria-label={`Progress cards: ${summary}`}>
      {TRACKS.map((t) => (
        <span key={t} className={`flex items-center gap-0.5 ${tracks[t] ? '' : 'opacity-40'}`}>
          <CardBack bg={TRACK_STYLE[t].color} />
          {tracks[t]}
        </span>
      ))}
    </span>
  );
}

/**
 * C&K city improvements at a glance: one column per track (trade, politics, science), filled from
 * the bottom, in even rows; a crown over a column marks a metropolis held.
 */
export function ImprovementGrid({ levels, metropolis, compact = false }: { levels: Record<Track, number>; metropolis: Track[]; compact?: boolean }) {
  const cell = compact ? 'h-1.5 w-2' : 'h-2 w-2.5';
  const summary = TRACKS.map((t) => `${TRACK_STYLE[t].label} ${levels[t]}${metropolis.includes(t) ? ' (metropolis)' : ''}`).join(' · ');
  return (
    <div className="flex shrink-0 items-center gap-0.5" title={`City improvements: ${summary}`} aria-label={`City improvements: ${summary}`}>
      {TRACKS.map((t) => {
        const s = TRACK_STYLE[t];
        return (
          <div key={t} className="relative flex flex-col items-center gap-px">
            {metropolis.includes(t) && (
              <Crown
                size={compact ? 9 : 11}
                strokeWidth={2.2}
                className="absolute bottom-full left-1/2 -translate-x-1/2 text-ink"
                style={{ fill: s.color }}
              />
            )}
            {[5, 4, 3, 2, 1].map((lvl) => {
              const on = lvl <= levels[t];
              return (
                <span
                  key={lvl}
                  className={`${cell} rounded-xs border ${on ? 'border-ink/70' : ''}`}
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
  align = 'right',
  highlight = true,
  seats,
  inline = false,
}: {
  view: PlayerView;
  room: RoomDTO | null;
  compact?: boolean;
  /** Extra tile shown before the players (e.g. the barbarian track on phones). */
  leading?: React.ReactNode;
  /** Which side of the screen the panel sits on: the current player's card sticks out towards the board. */
  align?: 'left' | 'right';
  /** Mark whose move it is (off where something else on screen already does). */
  highlight?: boolean;
  /** Only these seats, in this order (wide screens show the viewer's own card in the bottom bar). */
  seats?: number[];
  /** In the bottom bar: the card stays in line instead of sticking out on its turn. */
  inline?: boolean;
}) {
  // Whoever has to act: a pending prompt comes first (even a gold pick found during setup).
  const actors = new Set(
    view.pending.length ? view.pending.map((p) => p.seat) : view.phase === 'setup' && view.setup ? [view.setup.order[view.setup.index]] : [view.turn.seat],
  );
  const ck = view.mode === 'ck';
  // Whose turn it is (the player placing, during setup): their card sticks out towards the board.
  const turnSeat = view.phase === 'setup' && view.setup ? view.setup.order[view.setup.index] : view.phase === 'play' ? view.turn.seat : null;
  const me = view.viewer;
  const myEmbargo = me !== null ? (view.players[me].embargo ?? []) : [];
  // Clicking another player opens their card's options (the embargo toggle).
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol className={compact ? 'scroll-thin flex gap-2 overflow-x-auto pb-1' : 'grid gap-2'}>
      {leading && <li className="flex shrink-0">{leading}</li>}
      {(seats ?? view.players.map((_, i) => i)).map((seat) => {
        const p = view.players[seat];
        const c = PLAYER_COLORS[p.color];
        const seatInfo = room?.seats[seat];
        const acting = highlight && actors.has(seat) && view.phase !== 'ended';
        const vp = p.vp ?? p.publicVP;
        const clickable = me !== null && seat !== me && view.phase !== 'ended';
        const embargoed = myEmbargo.includes(seat);
        const toggle = () => setOpen(open === seat ? null : seat);
        // Players waiting for their go fade back a little, so whose move it is reads at a glance.
        const waiting = view.phase !== 'ended' && turnSeat !== null && seat !== turnSeat && !actors.has(seat);
        // The name, with who is a bot, offline or under your embargo.
        const nameRow = (
          <div className="flex min-w-0 items-center gap-1 pr-0.5">
            <span
              className="min-w-0 truncate text-sm font-extrabold leading-tight"
              title={seatInfo?.cosmetics.title ? titleInfo(seatInfo.cosmetics.title).name : undefined}
            >
              {p.name}
              {seat === view.viewer && <span className="ml-1 text-xs font-bold text-ink-faint">(you)</span>}
            </span>
            {p.isBot && <Bot size={13} className="shrink-0 text-ink-faint" />}
            {embargoed && (
              <span className="shrink-0 text-danger" title={`Embargo: offers from ${p.name} are declined`} aria-label={`Embargo on ${p.name}`}>
                <Ban size={13} strokeWidth={2.6} />
              </span>
            )}
            {seatInfo && !seatInfo.isBot && !seatInfo.connected && <WifiOff size={13} className="shrink-0 text-terracotta" aria-label="Disconnected" />}
            {seatInfo?.autopilot && seatInfo.connected === false && <span className="text-[10px] font-bold text-terracotta">auto</span>}
          </div>
        );
        // Avatar with the victory points underneath, as on colonist.
        const avatar = (
          <div className="relative mb-1.5 shrink-0" data-seat-anchor={seat}>
            {seatInfo ? (
              <Framed frame={seatInfo.cosmetics.frame} size={compact ? 36 : 40}>
                {(sz) => <KnightBadge knight={seatInfo.knight} color={p.color} size={sz} />}
              </Framed>
            ) : (
              <div className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} rounded-full`} style={{ background: c.hex }} />
            )}
            {/* A reaction covers the portrait; the points stay on top of it. */}
            <ReactionBubble playerId={p.id} side={compact ? 'below' : align === 'right' ? 'left' : 'right'} cover />
            <span
              className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-md border-2 border-ink bg-paper px-1.5 text-sm font-black leading-4.5 tabular"
              title={`${vp} victory points`}
            >
              {view.winner === seat && <Crown size={12} className="text-amber-deep" />}
              {vp}
            </span>
            {/* The merchant (C&K) rides on its holder's portrait, so the card keeps its height. */}
            {view.merchant?.owner === seat && (
              <span
                className="absolute -right-1.5 -top-1 grid h-5 w-5 place-items-center rounded-md border-[1.5px] border-ink bg-moss text-white"
                title="Has the merchant: 1 VP while it stays"
                aria-label="Has the merchant"
              >
                <Store size={12} strokeWidth={2.4} />
              </span>
            )}
          </div>
        );
        const contents = (
          <>
            <div className={`flex items-center ${compact ? 'gap-2.5' : 'gap-3 pt-1'}`}>
              <CardIcon
                bg={HAND_BG}
                ink="#1f1a14"
                n={p.handCount}
                title="Cards in hand"
                small={compact || ck}
                warn={view.phase === 'play' && p.handCount > handLimit(view, seat) ? `over ${handLimit(view, seat)}: a 7 costs half` : undefined}
              />
              {ck ? (
                <span className={`flex items-center ${compact ? 'gap-2.5' : 'gap-3'}`}>
                  {/* the hand and the three progress decks share one size, so their badges line up */}
                  {TRACKS.map((t) => (
                    <CardIcon key={t} bg={TRACK_STYLE[t].color} ink={TRACK_STYLE[t].ink} n={p.progressTracks[t]} title={`${TRACK_STYLE[t].label} progress cards`} glyph="" small />
                  ))}
                </span>
              ) : (
                <CardIcon bg={DEV_BG} n={p.devCount} title="Development cards" small={compact} />
              )}
            </div>
            {ck && <ImprovementGrid levels={p.improvements} metropolis={TRACKS.filter((t) => view.metropolis[t] === seat)} compact />}
            {/* One column: road, knights, and Defender points when there are any. */}
            <div className={`ml-auto shrink-0 text-xs font-black text-ink-soft ${compact ? 'flex items-center gap-1' : 'grid gap-px leading-4'}`}>
              <Stat
                icon={<Route size={13} />}
                value={p.roadLength}
                title={view.longestRoad === seat ? `Longest road (${p.roadLength})` : 'Road length'}
                award={view.longestRoad === seat ? 'bg-amber text-ink' : undefined}
              />
              {ck ? (
                (() => {
                  const strength = view.knights.reduce((n, k) => n + (k && k.owner === seat && k.active ? k.level : 0), 0);
                  // Active knights light the swords up in gold (as on colonist); none active, they fade.
                  return (
                    <Stat
                      icon={<Swords size={13} strokeWidth={strength ? 2.6 : 2} className={strength ? 'text-amber-deep' : 'opacity-40'} />}
                      value={<span className={strength ? 'text-ink' : 'opacity-40'}>{strength}</span>}
                      title={strength ? `Active knight strength: ${strength}` : 'No active knights'}
                    />
                  );
                })()
              ) : (
                <Stat
                  icon={<Swords size={13} />}
                  value={p.knightsPlayed}
                  title={view.largestArmy === seat ? `Largest army (${p.knightsPlayed} knights)` : 'Knights played'}
                  award={view.largestArmy === seat ? 'bg-terracotta text-white' : undefined}
                />
              )}
              {p.defender > 0 && (
                <Stat
                  icon={<ShieldHalf size={13} />}
                  value={p.defender}
                  title={`Defender of the island: ${p.defender} VP, one for each barbarian attack this player beat back best`}
                  award="bg-sea-600 text-white"
                />
              )}
            </div>
          </>
        );
        return (
          <li
            key={p.id}
            {...(clickable && {
              role: 'button',
              tabIndex: 0,
              'aria-expanded': open === seat,
              title: `${p.name}: embargo options`,
              onClick: toggle,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                toggle();
              },
            })}
            className={`paper-flat relative flex shrink-0 flex-col gap-0.5 px-2.5 py-1.5 pl-3 transition-all duration-300 motion-reduce:transition-none ${
              compact ? 'min-w-max' : `min-w-0 ${highlight && !inline && turnSeat === seat ? (align === 'right' ? '-ml-4' : '-mr-4') : ''}`
            } ${waiting ? 'opacity-70 saturate-50' : ''} ${
              acting ? 'ring-4 ring-amber' : ''
            } ${clickable ? 'cursor-pointer hover:brightness-[0.97]' : ''}`}
            style={{ boxShadow: `inset 5px 0 0 ${c.hex}` }}
          >
            {compact ? (
              <div className="flex items-center gap-2">
                {avatar}
                <div className="grid min-w-0 gap-1">
                  {nameRow}
                  <div className="flex items-center gap-2">{contents}</div>
                </div>
              </div>
            ) : (
              <>
                {nameRow}
                <div className="flex items-center gap-3">
                  {avatar}
                  {contents}
                </div>
              </>
            )}

            {clickable && open === seat && (
              <button
                type="button"
                className="mt-0.5 inline-flex items-center gap-1 self-start whitespace-nowrap rounded-md border border-danger/50 bg-danger/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-danger transition hover:bg-danger hover:text-white"
                title={embargoed ? `Accept trade offers from ${p.name} again` : `Decline every trade offer from ${p.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void api.act({ type: 'embargo', seat, on: !embargoed });
                  setOpen(null);
                }}
              >
                <Ban size={11} strokeWidth={2.8} />
                {embargoed ? 'End embargo' : 'Embargo'}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The table at a glance on phones: every player's points, hand and awards in one row that fits four
 * across (more scroll). Tapping it opens the full player cards, embargo options included.
 */
export function PlayerStrip({ view, room, leading }: { view: PlayerView; room: RoomDTO | null; leading?: React.ReactNode }) {
  const [details, setDetails] = useState(false);
  const actors = new Set(
    view.pending.length ? view.pending.map((p) => p.seat) : view.phase === 'setup' && view.setup ? [view.setup.order[view.setup.index]] : [view.turn.seat],
  );
  const ck = view.mode === 'ck';
  const me = view.viewer;
  return (
    <>
      <ol className="scroll-thin flex gap-1.5 overflow-x-auto p-1" aria-label="Players and scores">
        {leading && <li className="flex shrink-0">{leading}</li>}
        {view.players.map((p, seat) => {
          const acting = actors.has(seat) && view.phase !== 'ended';
          const vp = p.vp ?? p.publicVP;
          const limit = handLimit(view, seat);
          const over = view.phase === 'play' && p.handCount > limit;
          const special = ck ? TRACKS.reduce((n, t) => n + p.progressTracks[t], 0) : p.devCount;
          const awards = [
            view.longestRoad === seat && 'Longest road',
            !ck && view.largestArmy === seat && 'Largest army',
            view.merchant?.owner === seat && 'Merchant',
            p.defender > 0 && 'Defender',
          ].filter(Boolean);
          return (
            <li key={p.id} className="min-w-19 flex-1">
              <button
                type="button"
                onClick={() => setDetails(true)}
                aria-haspopup="dialog"
                aria-label={`${p.name}${seat === me ? ' (you)' : ''}: ${vp} points, ${p.handCount} cards${awards.length ? `, ${awards.join(', ')}` : ''}${acting ? ', to play' : ''}`}
                className={`paper-flat relative grid w-full gap-0.5 py-1 pl-2 pr-1 text-left transition-colors ${acting ? 'bg-amber' : ''}`}
                style={{ boxShadow: `inset 4px 0 0 ${PLAYER_COLORS[p.color].hex}` }}
              >
                <span className="flex min-w-0 items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-xs font-extrabold leading-tight">{seat === me ? 'You' : p.name}</span>
                  {room?.seats[seat] && !room.seats[seat].isBot && !room.seats[seat].connected && <WifiOff size={11} className="shrink-0 text-terracotta" />}
                  {view.longestRoad === seat && <Route size={12} className="shrink-0 rounded-xs bg-amber text-ink" />}
                  {!ck && view.largestArmy === seat && <Swords size={12} className="shrink-0 rounded-xs bg-terracotta text-white" />}
                  {view.merchant?.owner === seat && <Store size={12} className="shrink-0 rounded-xs bg-moss text-white" aria-label="Has the merchant" />}
                  {p.defender > 0 && <ShieldHalf size={12} className="shrink-0 rounded-xs bg-sea-600 text-white" />}
                </span>
                <span className="flex items-center gap-[3px] text-[11px] font-black tabular text-ink-soft">
                  <span className="relative mr-auto text-[15px] leading-none text-ink" data-seat-anchor={seat}>
                    {view.winner === seat && <Crown size={11} className="mr-0.5 inline text-amber-deep" />}
                    {vp}
                    <ReactionBubble playerId={p.id} side="below" />
                  </span>
                  <span className={`flex items-center gap-0.5 ${over ? 'rounded-md bg-danger px-0.5 text-paper' : ''}`}>
                    <CardBack bg={over ? WARN_BG : HAND_BG} />
                    {p.handCount}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <CardBack bg={ck ? '#7c6a9e' : DEV_BG} />
                    {special}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <Modal open={details} onClose={() => setDetails(false)} title="Players at the table">
        <div className="rounded-xl bg-sea-900 p-3">
          <PlayersPanel view={view} room={room} highlight={false} />
        </div>
      </Modal>
    </>
  );
}
