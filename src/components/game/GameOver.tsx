'use client';

import { Crown, Home, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import type { PlayerView } from '@/engine/view';
import { api } from '@/client/store';
import type { RoomDTO } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightBadge } from '@/components/knight/KnightBadge';
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

export function GameOver({ view, room, onClose }: { view: PlayerView; room: RoomDTO; onClose: () => void }) {
  const router = useRouter();
  const order = view.players.map((_, i) => i).sort((a, b) => (view.players[b].vp ?? 0) - (view.players[a].vp ?? 0));
  const winner = view.winner;
  const iWon = winner !== null && winner === view.viewer;
  return (
    <>
      {iWon && <Confetti />}
      <Modal open onClose={onClose} title={winner !== null ? (iWon ? 'Victory!' : `${view.players[winner].name} wins`) : 'Game over'} wide>
        <ol className="grid gap-2">
          {order.map((seat, rank) => {
            const p = view.players[seat];
            const c = PLAYER_COLORS[p.color];
            return (
              <li key={seat} className={`paper-flat flex items-center gap-3 p-2.5 ${seat === winner ? 'ring-4 ring-amber' : ''}`} style={{ boxShadow: `inset 6px 0 0 ${c.hex}` }}>
                <span className="display w-6 text-center text-2xl font-black text-ink-faint">{rank + 1}</span>
                {room.seats[seat] && <KnightBadge knight={room.seats[seat].knight} color={p.color} size={46} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-extrabold">
                    {p.name} {seat === winner && <Crown size={16} className="text-amber-deep" />}
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
            <button type="button" className="btn btn-primary px-5 py-2" onClick={() => api.rematch()}>
              <RotateCcw size={16} /> Rematch
            </button>
          ) : (
            <span className="self-center text-sm font-bold text-ink-soft">The host can start a rematch.</span>
          )}
        </div>
      </Modal>
    </>
  );
}
