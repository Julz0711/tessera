'use client';

import { ChartColumn, MessageSquare, ScrollText, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CARDS, shipsInPlay, type Card, type DevCardType, type GameEvent, type PartialHand, type ProgressCardType } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { DEV_NAMES, PROGRESS_NAMES, TRACK_NAMES } from '@/client/describe';
import { PLAYER_COLORS } from '@/shared/colors';
import { CARD_COLORS } from '@/client/palette';
import { BOARD_SCALE, usePrefs } from '@/client/prefs';
import { HUD_PANELS, HUD_SCALE, slotPanels, useWide, useZoomHost, type HudPanel } from '@/client/hud';
import { PALETTES, type BoardPalette } from '@/client/themes';
import { play } from '@/client/sound';
import { api, toast, useGame } from '@/client/store';
import { computeTargets, handlePick } from '@/client/interaction';
import { sceneFromView } from '@/client/targets';
import { useAutoDecline } from '@/client/trade';
import { useBackgroundMusic } from '@/client/music';
import { useBoardFlash, useGameDialog, useUi, type SideTab } from '@/client/ui';
import { BoardView } from '@/components/board/BoardView';
import { BuildPopup } from './BuildPopup';
import { ChatPanel } from '@/components/room/ChatPanel';
import { BankPanel } from './BankPanel';
import { BankStrip } from './BankStrip';
import { BarbarianMeter } from './ck/BarbarianMeter';
import { CkPromptDialog, PickBanner } from './ck/CkPrompts';
import { ImprovementsPanel } from './ck/ImprovementsPanel';
import { KnightMenu } from './ck/KnightMenu';
import { ProgressCardDialog } from './ck/ProgressCardDialog';
import { DevCardDialog } from './DevCardDialog';
import { DiceBox } from './DiceBox';
import { DiceHistogram } from './DiceStats';
import { Dock } from './Dock';
import { GameOver } from './GameOver';
import { LiveStatsDialog } from './LiveStatsDialog';
import { AdminToolsDialog } from './AdminToolsDialog';
import { LogPanel } from './LogPanel';
import { PlayerStrip, PlayersPanel } from './PlayersPanel';
import { DiscardDialog, FreeRoadsBanner, GoldDialog } from './Prompts';
import { RobberPopup } from './RobberPopup';
import { TopBar } from './TopBar';
import { OffersTray } from './TradePanel';
import { cardList, fly, type Place } from '@/client/fx';
import { TERRAIN_COMMODITY, TERRAIN_RESOURCE } from '@/engine/constants';
import { FlyLayer } from './FlyLayer';
import { DesktopHud, type HudSide } from './HudLayout';
import { Hand } from './Hand';
import { EventBanner, pushBanner } from './EventBanner';
import { Modal } from '@/components/ui/Modal';

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
    const who = (s: number) => (s === me ? 'You' : name(s));
    const color = (s: number) => (view.players[s] ? PLAYER_COLORS[view.players[s].color].hex : '#8a7a62');
    for (const ev of events) {
      const secret = ev.secret as Record<string, unknown> | undefined;
      switch (ev.type) {
        case 'diceRolled':
          play('dice');
          break;
        case 'produced':
          {
            // Each card flies from a tile that produced it (on the 2D board) to its new owner.
            const total = view.turn.dice ? view.turn.dice.red + view.turn.dice.yellow : null;
            const source = (c: Card): Place => {
              const hex = view.board.hexes.find(
                (h) => h.token === total && h.id !== view.robber && !h.fog && (TERRAIN_RESOURCE[h.terrain] === c || TERRAIN_COMMODITY[h.terrain] === c),
              );
              return hex ? { hex: hex.id } : 'board';
            };
            ev.gains.forEach((g, seat) => g && cardList(g).forEach((c, i) => fly(source(c), { seat }, [c], me, 250 + seat * 60 + i * 90)));
          }
          if (me !== null && ev.gains[me] && Object.keys(ev.gains[me]).length) {
            play('gain');
            toast(`+ ${cardsText(ev.gains[me])}`, 'good');
          }
          break;
        case 'built':
          play(ev.piece === 'wall' ? 'wall' : ev.piece === 'ship' ? 'road' : ev.piece);
          break;
        case 'robberMoved': {
          play('robber');
          const token = view.board.hexes[ev.hex]?.token;
          const robbed = events.find((e) => e.type === 'stole' && e.seat === ev.seat);
          const victim = robbed && robbed.type === 'stole' ? (robbed.victim === me ? 'you' : name(robbed.victim)) : null;
          pushBanner({
            icon: ev.pirate ? 'pirate' : 'robber',
            title: ev.pirate ? 'The pirate strikes' : 'The robber strikes',
            text: `${who(ev.seat)} moved the ${ev.pirate ? 'pirate' : 'robber'}${!ev.pirate && token ? ` onto a ${token}` : ''}${victim ? ` and robbed ${victim}` : ''}`,
            color: color(ev.seat),
            tone: robbed && robbed.type === 'stole' && robbed.victim === me ? 'bad' : 'info',
          });
          break;
        }
        case 'stole':
          play(ev.victim === me ? 'stolen' : 'steal');
          fly({ seat: ev.victim }, { seat: ev.seat }, [(secret?.card as Card | undefined) ?? null], me);
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
          play('trade');
          fly({ seat: ev.seat }, { seat: ev.partner }, cardList(ev.give), me);
          fly({ seat: ev.partner }, { seat: ev.seat }, cardList(ev.get), me, 150);
          break;
        case 'bankTrade':
          play('trade');
          fly({ seat: ev.seat }, 'bank', cardList(ev.give), me);
          fly('center', { seat: ev.seat }, cardList(ev.get), me, 450);
          break;
        case 'received':
          // Cards from the bank appear in the middle of the board and fly to whoever got them.
          fly('center', { seat: ev.seat }, cardList(ev.cards), me);
          break;
        case 'discarded':
          fly({ seat: ev.seat }, 'bank', cardList(ev.cards), me);
          break;
        case 'monopoly': {
          const others = view.players.map((_, i) => i).filter((i) => i !== ev.seat);
          const n = Math.min(ev.total, 6);
          for (let i = 0; i < n; i++) fly({ seat: others[i % others.length] }, { seat: ev.seat }, [ev.card], me, i * 90);
          break;
        }
        case 'tradeClosed':
          if (ev.seat === me) toast('Nobody took your offer');
          break;
        case 'tradeOffered':
          if (me !== null && ev.seat !== me && view.trades.some((t) => t.id === ev.id && t.to.includes(me))) play('offer');
          break;
        case 'devBought':
          if (ev.seat === me) play('card');
          fly('bank', { seat: ev.seat }, [null], me);
          if (ev.seat === me && secret?.card) toast(`You bought: ${DEV_NAMES[secret.card as DevCardType]}`);
          break;
        case 'devPlayed':
        case 'progressPlayed':
          play('card');
          break;
        case 'longestRoad':
          if (ev.seat !== null) play(ev.seat === me ? 'award' : 'card');
          if (ev.seat !== null) {
            pushBanner({ icon: 'road', title: 'Longest Road', text: `${who(ev.seat)} took the Longest Road (${ev.length})`, color: color(ev.seat), tone: ev.seat === me ? 'good' : 'info' });
          }
          break;
        case 'largestArmy':
          if (ev.seat !== null) play(ev.seat === me ? 'award' : 'card');
          if (ev.seat !== null) {
            pushBanner({ icon: 'army', title: 'Largest Army', text: `${who(ev.seat)} took the Largest Army (${ev.knights} knights)`, color: color(ev.seat), tone: ev.seat === me ? 'good' : 'info' });
          }
          break;
        case 'gameOver':
          play(me === null || ev.winner === me ? 'win' : 'lose');
          break;
        case 'barbarianAdvanced':
          play('barbarianStep');
          break;
        case 'barbarianAttack':
          play('barbarianAttack');
          if (ev.won) setTimeout(() => play('repelled'), 1300);
          pushBanner({
            icon: 'barbarians',
            title: ev.won ? 'Barbarians repelled!' : 'Barbarians overran the island',
            text: ev.won ? `The knights (${ev.defense}) held off the barbarians (${ev.strength})` : `The barbarians (${ev.strength}) beat the knights (${ev.defense})`,
            color: ev.won ? '#3f7d3a' : '#8f2a22',
            tone: ev.won ? 'good' : 'bad',
          });
          break;
        case 'cityLost':
          if (ev.seat === me) play('stolen');
          if (ev.seat === me) toast('The barbarians razed one of your cities', 'error');
          break;
        case 'defenderAwarded':
          if (ev.seat === me) play('award');
          pushBanner({ icon: 'defender', title: 'Defender of the island', text: `${ev.seat === me ? 'You are' : `${name(ev.seat)} is`} the Defender (+1 VP)`, color: color(ev.seat), tone: 'good' });
          break;
        case 'progressDrawn':
          if (ev.seat === me) play('card');
          if (ev.seat === me && secret?.card) toast(`New progress card: ${PROGRESS_NAMES[secret.card as ProgressCardType]}`);
          break;
        case 'metropolis':
          pushBanner({
            icon: 'metropolis',
            title: 'Metropolis!',
            text: `${who(ev.seat)} founded the ${TRACK_NAMES[ev.track]} metropolis${ev.from !== null ? ` (taken from ${ev.from === me ? 'you' : name(ev.from)})` : ''}`,
            color: color(ev.seat),
            tone: ev.from === me ? 'bad' : ev.seat === me ? 'good' : 'info',
          });
          play(ev.seat === me ? 'metropolis' : 'award');
          break;
        case 'improved':
          if (ev.seat === me) play('improve');
          break;
        case 'knightBuilt':
          play('knight');
          break;
        case 'knightPromoted':
        case 'knightActivated':
          if (ev.seat === me) play('knightUp');
          break;
        case 'knightDisplaced':
          if (ev.victim === me) toast(`${name(ev.seat)} displaced one of your knights`, 'error');
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateId]);
}

/** A chime when a new decision lands on you (discard, pick gold, move a knight…), and soft sounds for panels. */
function useUiSounds(view: PlayerView | null) {
  const me = view?.viewer ?? null;
  const prompts = me === null || !view ? '' : view.pending.filter((p) => p.seat === me).map((p) => p.kind).join(',');
  const previous = useRef('');
  useEffect(() => {
    const before = new Set(previous.current.split(',').filter(Boolean));
    if (prompts.split(',').some((k) => k && !before.has(k))) play('alert');
    previous.current = prompts;
  }, [prompts]);

  const panel = useUi((s) => s.panel ?? s.card?.kind ?? null);
  const opened = useRef(panel);
  useEffect(() => {
    if (panel === opened.current) return;
    play(panel ? 'open' : 'close');
    opened.current = panel;
  }, [panel]);
}

/** The 2D sea for the board theme: its gradient colours and pattern (read by .sea-2d). */
function seaVars(palette: BoardPalette): React.CSSProperties {
  const [centre, middle, edge] = palette.sea2d;
  return { '--sea-centre': centre, '--sea-middle': middle, '--sea-edge': edge, '--sea-pattern': palette.sea2dPattern } as React.CSSProperties;
}

export function GameScreen() {
  const view = useGame((s) => s.view);
  const room = useGame((s) => s.room);
  const events = useGame((s) => s.events);
  const updateId = useGame((s) => s.updateId);
  const unread = useGame((s) => s.unread);
  const prefs = usePrefs();
  const ui = useUi();
  const setZoomHost = useZoomHost((s) => s.set);
  const [highlight, setHighlight] = useState<number | null>(null);
  const flash = useBoardFlash();
  const [flashHexes, setFlashHexes] = useState<number[] | null>(null);
  const [showResults, setShowResults] = useState(true);

  useEventFeedback(view, events, updateId);
  useUiSounds(view);
  useAutoDecline(view);
  useBackgroundMusic();

  // Light up the rolled number for a few seconds. The timer hangs off the roll itself (rollKey), not
  // the event batch: the next update (a bot's build, the robber's move) would otherwise cancel it and
  // leave the number lit, and the rest of the board dimmed, until the following roll.
  const [rollKey, setRollKey] = useState(0);
  useEffect(() => {
    const roll = events.find((e) => e.type === 'diceRolled');
    if (!roll || roll.type !== 'diceRolled') return;
    setHighlight(roll.dice.red + roll.dice.yellow);
    setRollKey((k) => k + 1);
  }, [updateId, events]);
  useEffect(() => {
    if (!rollKey) return;
    const t = setTimeout(() => setHighlight(null), 3500);
    return () => clearTimeout(t);
  }, [rollKey]);

  // The Inventor's two tiles light up as they're swapped, and again from the log's "Show".
  useEffect(() => {
    const swap = events.find((e) => e.type === 'tokensSwapped');
    if (swap?.type === 'tokensSwapped') useBoardFlash.getState().flash([swap.a, swap.b]);
  }, [updateId, events]);
  useEffect(() => {
    if (!flash.hexes) return;
    setFlashHexes(flash.hexes);
    const t = setTimeout(() => setFlashHexes(null), 5000);
    return () => clearTimeout(t);
  }, [flash.key, flash.hexes]);

  // A new turn cancels any build mode or panel; a card being read stays open (bots move fast).
  useEffect(() => {
    ui.cancelModes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.turn.n, view?.turn.seat]);
  // A new prompt needs attention, so it closes everything, open cards included.
  useEffect(() => {
    ui.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.pending.length, view?.phase]);

  useEffect(() => {
    if (view?.phase === 'ended') setShowResults(true);
  }, [view?.phase]);

  const styles = useMemo(() => room?.seats.map((s) => s.knight) ?? [], [room?.seats]);
  const scene = useMemo(
    () => (view ? { ...sceneFromView(view, styles), highlightToken: highlight, highlightHexes: flashHexes } : null),
    [view, styles, highlight, flashHexes],
  );
  const targets = useMemo(
    () => computeTargets(view, ui.mode, prefs.buildHints, ui.armed, ui.robber),
    [view, ui.mode, prefs.buildHints, ui.armed, ui.robber],
  );

  const onVertex = useCallback((id: number) => view && void handlePick(view, 'vertex', id), [view]);
  const onEdge = useCallback((id: number) => view && void handlePick(view, 'edge', id), [view]);
  const onHex = useCallback((id: number) => view && void handlePick(view, 'hex', id), [view]);
  // From Tailwind's `xl` up the hand gets its own corner; below that there's no room beside the dock.
  const wide = useWide(1280);

  if (!view || !room || !scene) {
    return <div className="grid min-h-dvh place-items-center text-foam/60">Setting up the board…</div>;
  }

  const me = view.viewer;
  const myPrompt = me !== null ? view.pending.find((p) => p.seat === me) : undefined;
  const zoom = HUD_SCALE[prefs.hudScale];
  const layout = prefs.hudLayout;
  // Panels with nothing to show in this game: the barbarians outside Knights & Barbarians.
  const unused = (panel: HudPanel) => panel === 'barbarian' && view.mode !== 'ck';
  // A side column takes room from the flat board when it holds more than the (usually empty) offers
  // and the small zoom buttons.
  const columnUsed = (side: HudSide) =>
    HUD_PANELS.some((p) => p !== 'offers' && p !== 'zoom' && !unused(p) && (layout[p].slot === `${side}Top` || layout[p].slot === `${side}Bottom`));
  const board2d = {
    '--hud-t': `${64 * zoom}px`,
    '--hud-b': `${168 * zoom}px`,
    '--hud-l': `${(columnUsed('left') ? 300 : 8) * zoom}px`,
    '--hud-r': `${(columnUsed('right') ? 300 : 8) * zoom}px`,
  } as React.CSSProperties;
  // The dock keeps clear of the corners that hold something.
  const rightCorner = slotPanels(layout, 'cornerRight').length > 0;
  // The hand has the bottom-left corner on wide screens, so a panel kept there pushes the whole row over.
  const dockClear = `${rightCorner ? 'lg:right-56 xl:right-0' : ''} ${slotPanels(layout, 'cornerLeft').length ? 'lg:left-56' : ''}`;

  const renderPanel = (panel: HudPanel, side: HudSide) => {
    switch (panel) {
      case 'side':
        return (
          <div className={`flex h-72 flex-col overflow-hidden ${ui.sideTab === 'dice' ? 'min-h-48' : 'min-h-36'}`}>
            <SidePanel view={view} unread={unread} />
          </div>
        );
      case 'barbarian':
        return <BarbarianMeter view={view} />;
      case 'bank':
        return <BankStrip view={view} />;
      case 'players':
        return <PlayersPanel view={view} room={room} align={side} />;
      case 'dice':
        return <DiceBox view={view} size={60} />;
      case 'offers':
        return <OffersTray view={view} className="w-full" />;
      case 'zoom':
        // The 2D board portals its zoom buttons in here (empty on the 3D board).
        return <div ref={setZoomHost} />;
    }
  };

  return (
    <div
      className={`game-screen fixed inset-0 overflow-hidden ${prefs.view === '2d' ? 'sea-2d' : 'bg-sea-900'}`}
      style={seaVars(PALETTES[prefs.boardTheme])}
    >
      {/* The 3D canvas fills the screen (the camera frames the island above the dock); the flat
          2D board is fitted into the space the panels leave free. */}
      <div
        className={
          prefs.view === '2d' ? 'game-board absolute inset-x-2 bottom-80 top-37.5 lg:top-(--hud-t) lg:right-(--hud-r) lg:bottom-(--hud-b) lg:left-(--hud-l)' : 'game-board absolute inset-0'
        }
        style={prefs.view === '2d' ? board2d : undefined}
        data-board-anchor
      >
        <BoardView
          mode={prefs.view}
          quality={prefs.graphics}
          pieceScale={BOARD_SCALE[prefs.boardScale]}
          theme={prefs.boardTheme}
          weather={prefs.weather}
          scene={scene}
          targets={targets}
          popup={ui.armed ? <BuildPopup view={view} armed={ui.armed} /> : ui.robber ? <RobberPopup view={view} pick={ui.robber} /> : null}
          onBackground={ui.armed ? () => ui.arm(null) : ui.robber ? () => ui.setRobber(null) : undefined}
          interactive
          onVertex={targets.vertices.length ? onVertex : undefined}
          onEdge={targets.edges.length ? onEdge : undefined}
          onHex={targets.hexes.length ? onHex : undefined}
        />
      </div>

      {/* top: z-30 so the menu dropdown (opened from TopBar) paints above the bottom dock row
          (dice box, mobile log/chat) instead of being covered by it — both are otherwise the same
          stacking level and the dock comes later in the DOM. */}
      <div className="game-top absolute inset-x-0 top-0 z-30" style={{ zoom }}>
        <TopBar view={view} room={room} />
        <div className="pointer-events-none mt-1 flex flex-col items-center gap-2">
          {myPrompt?.kind === 'freeRoads' && (
            <div className="pointer-events-auto">
              <FreeRoadsBanner count={myPrompt.count} ships={shipsInPlay(view)} />
            </div>
          )}
          <div className="pointer-events-auto">
            <PickBanner view={view} />
          </div>
        </div>
      </div>

      {/* log/chat, bank, players, dice and offers on wide screens, wherever the player put them */}
      <DesktopHud render={renderPanel} skip={unused} />
      <div className="game-players absolute inset-x-2 top-26 z-10 lg:hidden" style={{ zoom }}>
        <PlayerStrip view={view} room={room} leading={view.mode === 'ck' && view.phase !== 'ended' ? <BarbarianMeter view={view} compact /> : undefined} />
      </div>

      {/* trade offers on smaller screens: top-left, below the players strip */}
      <div className="game-offers absolute left-2 top-45 z-20 lg:hidden" style={{ zoom }}>
        <OffersTray view={view} className="w-max min-w-[min(330px,calc(100vw-16px))] max-w-[calc(100vw-16px)]" />
      </div>

      {/* dock; on phones the log, chat and dice live in the top bar */}
      <div className={`game-bottom pointer-events-none absolute inset-x-0 bottom-2 z-20 flex flex-col gap-2 px-2 ${dockClear}`} style={{ zoom }}>
        {/* Only the dock itself takes clicks: this row spans the screen and would otherwise cover
            the dice box on wide screens. */}
        {/* Wide screens: the hand in the bottom-left corner, bigger, and the dock centred on its own. */}
        {/* Wide screens: the hand in the bottom-left corner, and the dock centred unless the hand needs
            the room (a hand wider than 36vw scrolls). The right column keeps the dock clear of the dice. */}
        <div
          className={`flex justify-center xl:grid xl:items-end xl:gap-3 ${rightCorner ? 'xl:grid-cols-[minmax(auto,1fr)_auto_minmax(10rem,1fr)]' : 'xl:grid-cols-[minmax(auto,1fr)_auto_minmax(0,1fr)]'}`}
        >
          {wide && (
            <div className="pointer-events-auto w-max max-w-[36vw]">
              {me !== null && <Hand view={view} size="xl" />}
            </div>
          )}
          <div className="game-dock-wrap pointer-events-auto min-w-0 max-w-full xl:col-start-2">
            <Dock view={view} room={room} hand={!wide} />
          </div>
        </div>
      </div>

      <FlyLayer />
      <EventBanner />

      {/* dialogs */}
      {myPrompt?.kind === 'discard' && <DiscardDialog view={view} prompt={myPrompt} />}
      {myPrompt?.kind === 'goldPick' && <GoldDialog view={view} prompt={myPrompt} />}
      {myPrompt && <CkPromptDialog view={view} prompt={myPrompt} />}
      {ui.panel === 'improve' && me !== null && <ImprovementsPanel view={view} />}
      {ui.card?.kind === 'progress' && me !== null && <ProgressCardDialog key={ui.card.id} view={view} id={ui.card.id} />}
      {ui.card?.kind === 'dev' && me !== null && <DevCardDialog key={ui.card.type} view={view} type={ui.card.type} />}
      {ui.knightMenu !== null && me !== null && <KnightMenu view={view} vertex={ui.knightMenu} />}
      {ui.panel === 'bank' && me !== null && <BankPanel view={view} />}
      <LiveStatsDialog view={view} />
      {room.you.isAdmin && <AdminToolsDialog view={view} room={room} />}
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
    <div className="glass flex min-h-0 flex-1 flex-col p-2.5">
      <div className="mb-2 flex gap-1">
        {SIDE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => ui.setSide(tab, true)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${
              ui.sideTab === tab ? 'bg-paper text-ink' : 'text-foam/60 hover:text-paper'
            }`}
          >
            {SIDE_ICON[tab]}
            {tab}
            {tab === 'chat' && unread > 0 && ui.sideTab !== 'chat' && <span className="h-2 w-2 rounded-full bg-amber" />}
          </button>
        ))}
      </div>
      <SideContent view={view} tab={ui.sideTab} />
    </div>
  );
}

const SIDE_TABS: SideTab[] = ['log', 'chat', 'dice'];
const SIDE_ICON: Record<SideTab, React.ReactNode> = {
  log: <ScrollText size={13} />,
  chat: <MessageSquare size={13} />,
  dice: <ChartColumn size={13} />,
};

function SideContent({ view, tab }: { view: PlayerView; tab: SideTab }) {
  if (tab === 'log') return <LogPanel view={view} className="min-h-0 flex-1" />;
  if (tab === 'chat') return <ChatPanel className="min-h-0 flex-1" dark />;
  return (
    <div className="scroll-thin grid min-h-0 flex-1 content-start gap-2 overflow-y-auto">
      {view.stats ? <DiceHistogram dice={view.stats.dice} compact /> : <p className="text-sm text-foam/40">No rolls recorded for this game.</p>}
      <FullStatsButton />
    </div>
  );
}

/** Opens the live stats: everything the end-of-game report shows, so far. */
function FullStatsButton() {
  return (
    <button type="button" className="btn justify-self-start px-3 py-1.5 text-xs" onClick={() => useGameDialog.getState().show('stats')}>
      <ChartColumn size={14} /> Full stats
    </button>
  );
}
