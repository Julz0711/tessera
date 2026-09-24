'use client';

import { MessageSquare, ScrollText, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CARDS, robberVictims, type Card, type DevCardType, type GameEvent, type PartialHand } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { DEV_NAMES } from '@/client/describe';
import { CARD_COLORS } from '@/client/palette';
import { usePrefs } from '@/client/prefs';
import { play } from '@/client/sound';
import { api, toast, useGame } from '@/client/store';
import { computeTargets, sceneFromView } from '@/client/targets';
import { useUi } from '@/client/ui';
import { BoardView } from '@/components/board/BoardView';
import { ChatPanel } from '@/components/room/ChatPanel';
import { BankPanel } from './BankPanel';
import { BankStrip } from './BankStrip';
import { DevPanel } from './DevPanel';
import { Dock } from './Dock';
import { GameOver } from './GameOver';
import { LogPanel } from './LogPanel';
import { PlayersPanel } from './PlayersPanel';
import { DiscardDialog, FreeRoadsBanner, VictimDialog } from './Prompts';
import { TopBar } from './TopBar';
import { OffersTray, TradePanel } from './TradePanel';

function cardsText(h: PartialHand): string {
  return CARDS.filter((c) => (h[c] ?? 0) > 0)
    .map((c) => `${h[c]} ${CARD_COLORS[c].label.toLowerCase()}`)
    .join(', ');
}

/** Sounds and toasts for what just happened. */
function useEventFeedback(view: PlayerView | null, events: GameEvent[], updateId: number) {
  useEffect(() => {
    if (!view || !events.length) return;
    const me = view.viewer;
    const name = (s: number) => view.players[s]?.name ?? '?';
    for (const ev of events) {
      const secret = ev.secret as Record<string, unknown> | undefined;
      switch (ev.type) {
        case 'diceRolled':
          play('dice');
          break;
        case 'produced':
          if (me !== null && ev.gains[me] && Object.keys(ev.gains[me]).length) {
            play('gain');
            toast(`+ ${cardsText(ev.gains[me])}`, 'good');
          }
          break;
        case 'built':
          play('build');
          break;
        case 'robberMoved':
          play('robber');
          break;
        case 'stole':
          if (ev.victim === me) toast(`${name(ev.seat)} stole ${secret?.card ? CARD_COLORS[secret.card as Card].label.toLowerCase() : 'a card'} from you`, 'error');
          else if (ev.seat === me && secret?.card) toast(`You stole ${CARD_COLORS[secret.card as Card].label.toLowerCase()} from ${name(ev.victim)}`, 'good');
          break;
        case 'turnStarted':
          if (ev.seat === me) {
            play('turn');
            toast('Your turn!', 'good');
          }
          break;
        case 'trade':
        case 'bankTrade':
          play('trade');
          break;
        case 'tradeOffered':
          if (me !== null && ev.seat !== me) play('chat');
          break;
        case 'devBought':
          if (ev.seat === me && secret?.card) toast(`You bought: ${DEV_NAMES[secret.card as DevCardType]}`);
          break;
        case 'longestRoad':
          if (ev.seat !== null) toast(`${ev.seat === me ? 'You' : name(ev.seat)} took the Longest Road`);
          break;
        case 'largestArmy':
          if (ev.seat !== null) toast(`${ev.seat === me ? 'You' : name(ev.seat)} took the Largest Army`);
          break;
        case 'gameOver':
          play('win');
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateId]);
}

export function GameScreen() {
  const view = useGame((s) => s.view);
  const room = useGame((s) => s.room);
  const events = useGame((s) => s.events);
  const updateId = useGame((s) => s.updateId);
  const unread = useGame((s) => s.unread);
  const prefs = usePrefs();
  const ui = useUi();
  const [highlight, setHighlight] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(true);

  useEventFeedback(view, events, updateId);

  // Light up the rolled number for a few seconds.
  useEffect(() => {
    const roll = events.find((e) => e.type === 'diceRolled');
    if (!roll || roll.type !== 'diceRolled') return;
    setHighlight(roll.dice.red + roll.dice.yellow);
    const t = setTimeout(() => setHighlight(null), 3500);
    return () => clearTimeout(t);
  }, [updateId, events]);

  // Leaving your turn (or a new prompt) cancels any build mode.
  useEffect(() => {
    ui.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.turn.n, view?.turn.seat, view?.pending.length, view?.phase]);

  useEffect(() => {
    if (view?.phase === 'ended') setShowResults(true);
  }, [view?.phase]);

  const styles = useMemo(() => room?.seats.map((s) => s.knight) ?? [], [room?.seats]);
  const scene = useMemo(() => (view ? { ...sceneFromView(view, styles), highlightToken: highlight } : null), [view, styles, highlight]);
  const targets = useMemo(() => computeTargets(view, ui.mode), [view, ui.mode]);

  const onVertex = useCallback(
    async (vertex: number) => {
      if (!view) return;
      const kind = targets.kind;
      const r = await api.act(kind === 'city' ? { type: 'buildCity', vertex } : { type: 'buildSettlement', vertex });
      if (r.ok) ui.setMode(null);
    },
    [view, targets.kind, ui],
  );
  const onEdge = useCallback(
    async (edge: number) => {
      const r = await api.act({ type: 'buildRoad', edge });
      if (r.ok) ui.setMode(null);
    },
    [ui],
  );
  const onHex = useCallback(
    async (hex: number) => {
      if (!view || view.viewer === null) return;
      const victims = robberVictims(view, view.viewer, hex);
      if (victims.length > 1) ui.setRobberHex(hex);
      else await api.act({ type: 'moveRobber', hex, victim: victims[0] ?? null });
    },
    [view, ui],
  );

  if (!view || !room || !scene) {
    return <div className="grid min-h-dvh place-items-center text-foam/60">Setting up the board…</div>;
  }

  const me = view.viewer;
  const myPrompt = me !== null ? view.pending.find((p) => p.seat === me) : undefined;

  return (
    <div className={`fixed inset-0 overflow-hidden ${prefs.view === '2d' ? 'sea-2d' : 'bg-sea-900'}`}>
      {/* The 3D canvas fills the screen (the camera frames the island above the dock); the flat
          2D board is fitted into the space the panels leave free. */}
      <div className={prefs.view === '2d' ? 'absolute inset-x-2 bottom-44.5 top-37.5 lg:bottom-42 lg:left-85 lg:right-75 lg:top-16' : 'absolute inset-0'}>
        <BoardView
          mode={prefs.view}
          quality={prefs.graphics}
          scene={scene}
          targets={targets}
          interactive
          onVertex={targets.vertices.length ? onVertex : undefined}
          onEdge={targets.edges.length ? onEdge : undefined}
          onHex={targets.hexes.length ? onHex : undefined}
        />
      </div>

      {/* top */}
      <div className="absolute inset-x-0 top-0 z-20">
        <TopBar view={view} room={room} />
        <div className="pointer-events-none mt-1 flex flex-col items-center gap-2">
          {myPrompt?.kind === 'freeRoads' && (
            <div className="pointer-events-auto">
              <FreeRoadsBanner count={myPrompt.count} />
            </div>
          )}
        </div>
      </div>

      {/* players + offers: right column on desktop */}
      <div className="absolute right-2 top-16 z-10 hidden max-h-[calc(100dvh-220px)] w-72 flex-col gap-2 lg:flex">
        <BankStrip view={view} />
        <PlayersPanel view={view} room={room} />
        <OffersTray view={view} className="w-full" />
      </div>
      <div className="absolute inset-x-2 top-26 z-10 lg:hidden">
        <PlayersPanel view={view} room={room} compact />
      </div>
      <div className="absolute bottom-43 right-2 z-20 lg:hidden">
        <OffersTray view={view} className="w-[min(420px,92vw)]" />
      </div>

      {/* log & chat */}
      <div className="absolute bottom-2 left-2 z-20 hidden w-80 md:block">
        <SidePanel view={view} unread={unread} />
      </div>
      <div className="absolute bottom-41 left-2 z-20 md:hidden">
        <MobileSide view={view} unread={unread} />
      </div>

      {/* dock */}
      <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center px-2 md:left-85 lg:left-0">
        <Dock view={view} />
      </div>

      {/* dialogs */}
      {myPrompt?.kind === 'discard' && <DiscardDialog view={view} prompt={myPrompt} />}
      {ui.robberHex !== null && myPrompt?.kind === 'robber' && <VictimDialog view={view} hex={ui.robberHex} />}
      {ui.panel === 'trade' && me !== null && <TradePanel view={view} />}
      {ui.panel === 'bank' && me !== null && <BankPanel view={view} />}
      {ui.panel === 'dev' && me !== null && <DevPanel view={view} />}
      {view.phase === 'ended' && showResults && <GameOver view={view} room={room} onClose={() => setShowResults(false)} />}
      {view.phase === 'ended' && !showResults && (
        <button type="button" className="btn btn-primary absolute bottom-40 left-1/2 z-30 -translate-x-1/2 px-5 py-2.5" onClick={() => setShowResults(true)}>
          <Trophy size={18} /> Results
        </button>
      )}
    </div>
  );
}

function SidePanel({ view, unread }: { view: PlayerView; unread: number }) {
  const ui = useUi();
  return (
    <div className="glass flex h-72 flex-col p-2.5">
      <div className="mb-2 flex gap-1">
        {(['log', 'chat'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => ui.setSide(tab, true)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${
              ui.sideTab === tab ? 'bg-paper text-ink' : 'text-foam/60 hover:text-paper'
            }`}
          >
            {tab === 'log' ? <ScrollText size={13} /> : <MessageSquare size={13} />}
            {tab}
            {tab === 'chat' && unread > 0 && ui.sideTab !== 'chat' && <span className="h-2 w-2 rounded-full bg-amber" />}
          </button>
        ))}
      </div>
      {ui.sideTab === 'log' ? <LogPanel view={view} className="min-h-0 flex-1" /> : <ChatPanel className="min-h-0 flex-1" dark />}
    </div>
  );
}

function MobileSide({ view, unread }: { view: PlayerView; unread: number }) {
  const [open, setOpen] = useState<null | 'log' | 'chat'>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      {open && (
        <div className="glass flex h-60 w-[min(340px,calc(100vw-16px))] flex-col p-2.5">
          {open === 'log' ? <LogPanel view={view} className="min-h-0 flex-1" /> : <ChatPanel className="min-h-0 flex-1" dark />}
        </div>
      )}
      <div className="flex gap-1.5">
        <button type="button" className={`btn btn-dark h-10 w-10 p-0 ${open === 'log' ? 'btn-primary' : ''}`} onClick={() => setOpen(open === 'log' ? null : 'log')} aria-label="Game log">
          <ScrollText size={17} />
        </button>
        <button type="button" className={`btn btn-dark relative h-10 w-10 p-0 ${open === 'chat' ? 'btn-primary' : ''}`} onClick={() => setOpen(open === 'chat' ? null : 'chat')} aria-label="Chat">
          <MessageSquare size={17} />
          {unread > 0 && open !== 'chat' && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-ink bg-amber" />}
        </button>
      </div>
    </div>
  );
}
