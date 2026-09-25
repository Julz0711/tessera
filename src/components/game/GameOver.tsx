'use client';

import { Crown, Home, RotateCcw, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { handTotal, PIPS } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { api } from '@/client/store';
import type { RoomDTO } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { Framed, TitleTag } from '@/components/profile/Cosmetics';
import { Modal } from '@/components/ui/Modal';

function breakdown(view: PlayerView, seat: number): [string, number][] {
  let settlements = 0;
  let cities = 0;
  let metros = 0;
  for (const b of view.buildings) {
    if (!b || b.owner !== seat) continue;
    if (b.city) cities++;
    else settlements++;
    if (b.metropolis) metros++;
  }
  const p = view.players[seat];
  const rows: [string, number][] = [
    ['Settlements', settlements],
    ['Cities', cities * 2],
  ];
  if (metros) rows.push(['Metropolises', metros * 2]);
  if (view.longestRoad === seat) rows.push(['Longest road', 2]);
  if (view.largestArmy === seat) rows.push(['Largest army', 2]);
  const vpCards = p.devCards.filter((c) => c.type === 'victoryPoint').length;
  if (vpCards) rows.push(['VP cards', vpCards]);
  if (p.defender) rows.push(['Defender', p.defender]);
  if (p.progressVP) rows.push(['Progress VP', p.progressVP]);
  if (view.merchant?.owner === seat) rows.push(['Merchant', 1]);
  return rows.filter(([, n]) => n > 0);
}

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.4 + Math.random() * 1.8,
        color: ['#f2b33d', '#d9483b', '#3a74d8', '#3f9b4f', '#f6eddb', '#8b5bc9'][i % 6],
        rot: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute top-[-20px] h-3 w-2 rounded-sm"
          style={{ left: `${b.left}%`, background: b.color, transform: `rotate(${b.rot}deg)`, animation: `confetti ${b.dur}s ${b.delay}s cubic-bezier(.2,.6,.4,1) forwards` }}
        />
      ))}
      <style>{`@keyframes confetti { to { transform: translateY(110vh) rotate(720deg); opacity: .9 } }`}</style>
    </div>
  );
}

const DICE_TOTALS = Array.from({ length: 11 }, (_, i) => i + 2); // 2..12

/** A dice-roll histogram for totals 2–12, with a dashed marker at each total's expected count. */
function DiceHistogram({ dice }: { dice: number[] }) {
  const totalRolls = dice.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...DICE_TOTALS.map((t) => dice[t] ?? 0));
  return (
    <div className="paper-flat p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">Dice rolls</span>
        <span className="text-xs font-bold text-ink-faint">{totalRolls} total</span>
      </div>
      <div className="grid grid-cols-11 items-end gap-1 sm:gap-1.5">
        {DICE_TOTALS.map((t) => {
          const count = dice[t] ?? 0;
          const expected = (totalRolls * (PIPS[t] ?? 0)) / 36;
          return (
            <div key={t} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-black tabular">{count}</span>
              <div className="relative flex h-20 w-full items-end justify-center rounded-sm bg-ink/6 sm:h-24">
                <span
                  className="absolute inset-x-0.5 border-t-2 border-dashed border-terracotta/70"
                  style={{ bottom: `${Math.min(100, (expected / maxCount) * 100)}%` }}
                  title={`Expected ≈ ${expected.toFixed(1)} rolls of ${t}`}
                />
                <div className="w-full rounded-t-sm bg-sea-600" style={{ height: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="text-[10px] font-bold text-ink-faint">{t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StatCol {
  label: string;
  title: string;
  value: (seat: number) => ReactNode;
}

/** A compact per-player breakdown, scrolling horizontally inside the modal on narrow screens. */
function StatsTable({ view }: { view: PlayerView }) {
  const stats = view.stats;
  const cols: StatCol[] = [
    { label: 'Production', title: 'Cards gained from hex production', value: (seat) => handTotal(stats.produced[seat]) },
    { label: 'Other', title: 'Cards gained any other way: discovery, gold, monopoly, year of plenty, aqueduct, ...', value: (seat) => stats.otherGain[seat] },
    {
      label: 'Stolen/Lost',
      title: 'Cards taken with the robber or pirate, and cards taken from you',
      value: (seat) => (
        <>
          {stats.stolen[seat]}
          <span className="text-ink-faint">/{stats.lost[seat]}</span>
        </>
      ),
    },
    { label: 'Discarded', title: 'Cards discarded on a 7', value: (seat) => stats.discarded[seat] },
    {
      label: 'Trades',
      title: 'Bank trades · trades with other players',
      value: (seat) => (
        <>
          {stats.bankTrades[seat]}
          <span className="text-ink-faint">·{stats.playerTrades[seat]}</span>
        </>
      ),
    },
    view.mode === 'ck'
      ? { label: 'Progress', title: 'Progress cards played', value: (seat) => stats.progressPlayed[seat] }
      : {
          label: 'Dev cards',
          title: 'Development cards bought · knights played',
          value: (seat) => (
            <>
              {stats.devBought[seat]}
              <span className="text-ink-faint">·{stats.knightsPlayed[seat]}</span>
            </>
          ),
        },
  ];
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-120 border-collapse">
        <thead>
          <tr>
            <th className="label px-2 pb-1.5 text-left">Player</th>
            {cols.map((c) => (
              <th key={c.label} className="label px-2 pb-1.5 text-right" title={c.title}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.players.map((p, seat) => {
            const c = PLAYER_COLORS[p.color];
            return (
              <tr key={seat} className="border-t border-ink/10">
                <td className="py-1.5 pr-2 pl-2.5 text-sm font-extrabold whitespace-nowrap" style={{ boxShadow: `inset 4px 0 0 ${c.hex}` }}>
                  {p.name}
                </td>
                {cols.map((col) => (
                  <td key={col.label} className="px-2 py-1.5 text-right text-sm font-bold tabular">
                    {col.value(seat)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatsView({ view }: { view: PlayerView }) {
  if (!view.stats) return <p className="text-sm font-semibold text-ink-faint">No stats recorded for this game.</p>;
  return (
    <div className="grid gap-3">
      <DiceHistogram dice={view.stats.dice} />
      <StatsTable view={view} />
    </div>
  );
}

export function GameOver({ view, room, onClose }: { view: PlayerView; room: RoomDTO; onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<'standings' | 'stats'>('standings');
  const order = view.players.map((_, i) => i).sort((a, b) => (view.players[b].vp ?? 0) - (view.players[a].vp ?? 0));
  const winner = view.winner;
  const iWon = winner !== null && winner === view.viewer;
  return (
    <>
      {iWon && <Confetti />}
      <Modal open onClose={onClose} title={winner !== null ? (iWon ? 'Victory!' : `${view.players[winner].name} wins`) : 'Game over'} wide>
        <div className="mb-3 flex gap-1.5">
          {(['standings', 'stats'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`flex-1 rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition ${
                tab === t ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white/40 hover:border-ink/60'
              }`}
            >
              {t === 'standings' ? 'Standings' : 'Stats'}
            </button>
          ))}
        </div>
        {tab === 'standings' ? (
          <ol className="grid gap-2">
            {order.map((seat, rank) => {
              const p = view.players[seat];
              const c = PLAYER_COLORS[p.color];
              return (
                <li key={seat} className={`paper-flat flex items-center gap-3 p-2.5 ${seat === winner ? 'ring-4 ring-amber' : ''}`} style={{ boxShadow: `inset 6px 0 0 ${c.hex}` }}>
                  <span className="display w-6 text-center text-2xl font-black text-ink-faint">{rank + 1}</span>
                  {room.seats[seat] && (
                    <Framed frame={room.seats[seat].cosmetics.frame} size={50}>
                      {(s) => <KnightBadge knight={room.seats[seat].knight} color={p.color} size={s} />}
                    </Framed>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-extrabold">
                      {p.name} {seat === winner && <Crown size={16} className="text-amber-deep" />}
                      <TitleTag title={room.seats[seat]?.cosmetics.title} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs font-semibold text-ink-soft">
                      {breakdown(view, seat).map(([label, n]) => (
                        <span key={label}>
                          {label} <b>{n}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="display text-3xl font-black tabular">{p.vp}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <StatsView view={view} />
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn px-4 py-2"
            onClick={async () => {
              await api.leaveRoom();
              router.push('/');
            }}
          >
            <Home size={16} /> Home
          </button>
          {room.you.isHost ? (
            <>
              <button type="button" className="btn px-4 py-2" onClick={() => api.backToLobby()} title="Change settings or players, then start again">
                <Users size={16} /> Back to lobby
              </button>
              <button type="button" className="btn btn-primary px-5 py-2" onClick={() => api.rematch()} title="Same players and settings, new board">
                <RotateCcw size={16} /> Rematch
              </button>
            </>
          ) : (
            <span className="self-center text-sm font-bold text-ink-soft">Waiting for the host: rematch or back to the lobby.</span>
          )}
        </div>
      </Modal>
    </>
  );
}
