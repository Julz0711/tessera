'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BOARD_SCALE, usePrefs } from '@/client/prefs';
import { PALETTES } from '@/client/themes';
import { sceneFromView } from '@/client/targets';
import { BoardView } from '@/components/board/BoardView';
import { HexSpinner } from '@/components/ui/HexSpinner';
import { VERDICT_LABEL } from '@/bots/analysis/accuracy';
import type { FlaggedMove, GameAnalysis } from '@/bots/analysis/types';
import { buildReplay, type Replay, type ReplayData, type ReplayMarker } from '@/engine/replay';
import { NO_TARGETS } from '@/components/board/types';
import { viewFor } from '@/engine/view';
import type { RoomDTO } from '@/shared/protocol';
import { BarbarianMeter } from '../ck/BarbarianMeter';
import { LogPanel } from '../LogPanel';
import { PlayersPanel } from '../PlayersPanel';
import { ReplayHands } from './ReplayHands';
import { SPEEDS, Timeline } from './Timeline';

/** Real time between actions at 1×. */
const STEP_MS = 650;

/** The sea behind the board, as on the game screen (read by .sea-2d). */
function seaVars(theme: keyof typeof PALETTES): React.CSSProperties {
  const [centre, middle, edge] = PALETTES[theme].sea2d;
  return { '--sea-centre': centre, '--sea-middle': middle, '--sea-edge': edge, '--sea-pattern': PALETTES[theme].sea2dPattern } as React.CSSProperties;
}

/**
 * A finished game played back from its recorded actions, with everything revealed. It is read-only: the
 * board has no handlers and none of the game's dialogs or dock are mounted.
 */
export function ReplayViewer({ gameId, room, onClose }: { gameId: string; room: RoomDTO; onClose: () => void }) {
  const prefs = usePrefs();
  const [replay, setReplay] = useState<Replay | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(SPEEDS[0]);
  // The board's look and the side tab are the replay's own; the game's settings stay as they are.
  const [boardMode, setBoardMode] = useState<'2d' | '3d'>(prefs.view);
  const [tab, setTab] = useState<'hands' | 'log'>('hands');

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/replay`, { signal: controller.signal });
        if (!response.ok) throw new Error(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'The replay could not be loaded.');
        const data = (await response.json()) as ReplayData & { analysis?: GameAnalysis };
        if (controller.signal.aborted) return;
        // Let the "rebuilding" frame paint before the engine runs through the whole game.
        await new Promise((r) => setTimeout(r, 30));
        if (controller.signal.aborted) return;
        setReplay(buildReplay(data));
        setAnalysis(data.analysis ?? null);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'The replay could not be loaded.');
      }
    })();
    return () => controller.abort();
  }, [gameId]);

  const total = replay?.total ?? 0;
  const go = useCallback((to: number) => setStep(Math.max(0, Math.min(total, Math.round(to)))), [total]);
  const stepBy = useCallback((delta: number) => setStep((s) => Math.max(0, Math.min(total, s + delta))), [total]);
  const turnBy = useCallback(
    (delta: number) => {
      if (!replay) return;
      setStep((s) => {
        const starts = replay.turns.map((t) => t.step);
        const to = delta > 0 ? (starts.find((x) => x > s) ?? total) : ([...starts].reverse().find((x) => x < s) ?? 0);
        return to;
      });
    },
    [replay, total],
  );
  const toggle = useCallback(() => setPlaying((p) => (step >= total ? (setStep(0), true) : !p)), [step, total]);

  // Playback: one action per tick, stopping at the end.
  useEffect(() => {
    if (!playing || !replay) return;
    if (step >= total) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep(step + 1), STEP_MS / speed);
    return () => clearTimeout(t);
  }, [playing, step, speed, replay, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, select, textarea')) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ') toggle();
      else if (e.key === 'ArrowLeft') (e.shiftKey ? turnBy : stepBy)(-1);
      else if (e.key === 'ArrowRight') (e.shiftKey ? turnBy : stepBy)(1);
      else return;
      // A focused key would also "click" on Space: the shortcut is all that should happen.
      e.preventDefault();
      e.stopPropagation();
    };
    const swallowSpace = (e: KeyboardEvent) => e.key === ' ' && e.preventDefault();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', swallowSpace, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', swallowSpace, true);
    };
  }, [onClose, toggle, stepBy, turnBy]);

  const styles = useMemo(() => room.seats.map((s) => s.knight), [room.seats]);
  const state = replay?.stateAt(step) ?? null;
  // No viewer, everything open: hands, development and progress cards, fog and treasures.
  const view = useMemo(() => (state ? viewFor(state, null, true) : null), [state]);
  const scene = useMemo(() => (view ? sceneFromView(view, styles) : null), [view, styles]);

  // The analysis' mistakes and blunders (inaccuracies only count towards accuracy), each marked just before the move.
  const flagged = useMemo(() => (analysis?.moves ?? []).filter((m) => m.verdict !== 'inaccuracy' && m.step < total), [analysis, total]);
  const names = useMemo(() => view?.players.map((p) => p.name) ?? [], [view?.players]);
  const moveMarkers = useMemo<ReplayMarker[]>(
    () => flagged.map((m) => ({ step: m.step, kind: m.verdict as 'mistake' | 'blunder', seat: m.seat, label: `${VERDICT_LABEL[m.verdict]} by ${names[m.seat] ?? 'a player'} (−${m.loss}% win chance): ${m.played}. Better: ${m.best}` })),
    [flagged, names],
  );
  // On the move (before or just after it), the verdict is spelled out above the timeline.
  const current: FlaggedMove | undefined = flagged.find((m) => step === m.step || step === m.step + 1);

  const turn = replay?.turns.findLast((t) => t.step <= step);
  const turnLabel = !view ? '' : view.phase === 'setup' || !turn ? 'Setup' : `Turn ${turn.n} · ${view.players[turn.seat]?.name ?? ''}`;

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col gap-2 p-2 sm:p-3 ${boardMode === '2d' ? 'sea-2d' : 'bg-sea-900'}`}
      style={seaVars(prefs.boardTheme)}
      role="dialog"
      aria-label="Game replay"
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h2 className="display text-xl font-black text-paper">Replay</h2>
        <div className="ml-auto flex gap-1" role="group" aria-label="Board view">
          {(['2d', '3d'] as const).map((m) => (
            <button key={m} type="button" className={`btn h-9 min-h-0 px-3 text-sm uppercase ${boardMode === m ? 'btn-dark' : ''}`} aria-pressed={boardMode === m} onClick={() => setBoardMode(m)}>
              {m}
            </button>
          ))}
        </div>
        <button type="button" className="btn h-9 min-h-0 px-3 text-sm" onClick={onClose} title="Back to the results (Esc)">
          <X size={16} /> Close
        </button>
      </div>

      {error ? (
        <div className="grid min-h-0 flex-1 place-items-center">
          <div className="paper max-w-sm p-5 text-center">
            <p className="font-bold">{error}</p>
            <button type="button" className="btn btn-primary mt-3 px-4 py-2" onClick={onClose}>
              Back to the results
            </button>
          </div>
        </div>
      ) : !replay || !view || !scene ? (
        <div className="grid min-h-0 flex-1 place-items-center">
          <div className="flex flex-col items-center gap-4 text-foam/70">
            <HexSpinner size={56} decorative />
            <div className="label-light">Rebuilding the game…</div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 gap-2">
            <div className="relative min-w-0 flex-1">
              <BoardView
                mode={boardMode}
                quality={prefs.graphics}
                pieceScale={BOARD_SCALE[prefs.boardScale]}
                theme={prefs.boardTheme}
                weather={prefs.weather}
                scene={scene}
                targets={NO_TARGETS}
              />
              {/* Phones: the players over the board's corner, as compact cards. */}
              <div className="absolute inset-x-0 top-0 lg:hidden">
                <PlayersPanel view={view} room={room} compact />
              </div>
            </div>
            <aside className="hidden min-h-0 w-72 shrink-0 flex-col gap-2 lg:flex xl:w-80">
              {/* The list keeps its natural height (it only scrolls on a very short window); the hands or log below scroll instead. */}
              <div className="scroll-thin min-h-0 overflow-y-auto">
                <PlayersPanel view={view} room={room} stepOut={false} />
              </div>
              {/* The 3D board draws the barbarians' track beside the island; the flat board doesn't. */}
              {view.mode === 'ck' && boardMode === '2d' && <BarbarianMeter view={view} />}
              <div className="glass flex min-h-36 flex-1 flex-col gap-2 p-2.5">
                <div className="flex shrink-0 gap-1" role="tablist">
                  {(['hands', 'log'] as const).map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                      className={`rounded px-2 py-0.5 text-xs font-black uppercase tracking-wide ${tab === t ? 'bg-paper text-ink' : 'text-foam/70 hover:text-paper'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                {tab === 'hands' ? <ReplayHands view={view} /> : <LogPanel view={view} className="min-h-0 flex-1" />}
              </div>
            </aside>
          </div>
          <div className="shrink-0">
            {current && view && (
              <p className="mb-1.5 flex flex-wrap items-baseline gap-x-2 rounded-md border-2 border-ink bg-paper px-2.5 py-1 text-xs font-bold text-ink">
                <span className={`rounded-sm border-2 border-ink px-1 font-black ${current.verdict === 'blunder' ? 'bg-danger text-paper' : 'bg-amber'}`}>
                  {current.verdict === 'blunder' ? '??' : '?'} {VERDICT_LABEL[current.verdict]}
                </span>
                <span>{view.players[current.seat]?.name}: {current.played}</span>
                <span className="text-ink-soft">Better: {current.best}</span>
                <span className="ml-auto tabular text-ink-soft">−{current.loss}% win chance</span>
              </p>
            )}
            {replay.stopped && (
              <p className="mb-1.5 rounded-md border-2 border-ink bg-amber px-2.5 py-1 text-xs font-bold text-ink">
                The replay ends here: the game was edited by an admin.
              </p>
            )}
            <Timeline
              replay={replay}
              colors={view.players.map((p) => p.color)}
              names={view.players.map((p) => p.name)}
              step={step}
              playing={playing}
              speed={speed}
              turnLabel={turnLabel}
              onStep={stepBy}
              onTurn={turnBy}
              onPlay={toggle}
              onSpeed={setSpeed}
              onSeek={go}
              moves={moveMarkers}
            />
          </div>
        </>
      )}
    </div>
  );
}
