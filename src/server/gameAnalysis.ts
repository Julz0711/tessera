/**
 * Background move analysis of finished games (accuracy, blunders; see src/bots/analysis). Each game is
 * analysed once, after it has been finalized, in a worker thread so the game rooms never wait on it;
 * games are queued and run one at a time to stay within a free tier's CPU and memory. The result is
 * stored on the game (and the accuracy on each player row), and rated players get a small Elo nudge.
 *
 * Needs the database (the moves come from the stored history); in-memory servers never analyse.
 * Restarts: the queue lives in memory, so a game still waiting when the server stops is simply never
 * analysed (its end screen shows nothing) — simpler than tracking jobs, and losing one is harmless.
 */
import { Worker } from 'node:worker_threads';
import { Prisma } from '@/generated/prisma/client';
import { ANALYSIS_DEFAULTS, type AnalysisOptions } from '@/bots/analysis/analyse';
import { MIN_RATED_DECISIONS, accuracyEloNudge } from '@/bots/analysis/accuracy';
import type { AnalysisStatus, GameAnalysis } from '@/bots/analysis/types';
import type { ReplayData } from '@/engine/replay';
import { getDb, logDbError, type Db } from './db';
import { lockIdentities } from './finalizeGame';
import { loadReplayData, tableMember } from './historyApi';
import type { ServerIdentity } from './identity';

/** The worker idles this long per unit of work (1: it takes at most about half of one core). */
export const ANALYSIS_IDLE_RATIO = 1;
/** A game ended this recently and not queued yet is about to be (its finalize job is finishing). */
const JUST_ENDED_MS = 15_000;

const queue: string[] = [];
const waiting = new Set<string>();
let draining = false;

/** `GAME_ANALYSIS=off` turns the analysis off (e.g. on a server that is short of CPU). */
export const analysisEnabled = () => process.env.GAME_ANALYSIS !== 'off';

/** Queues a finished game for analysis (no-op without a database, or when already queued). */
export function scheduleAnalysis(gameId: string): void {
  if (!analysisEnabled() || !getDb() || waiting.has(gameId)) return;
  waiting.add(gameId);
  queue.push(gameId);
  void drain();
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    for (let gameId = queue.shift(); gameId; gameId = queue.shift()) {
      const db = getDb();
      try {
        if (db) await analyseStoredGame(db, gameId);
      } catch (err) {
        logDbError(`game analysis (${gameId})`, err);
      } finally {
        waiting.delete(gameId);
      }
    }
  } finally {
    draining = false;
  }
}

/** Seats played by people (also those who left and let a bot finish): analysed first. */
type SeatRow = { seat: number; isBot: boolean; userId: string | null; guestSessionId: string | null };
export const humanSeats = (players: SeatRow[]) => players.filter((p) => !p.isBot || p.userId || p.guestSessionId).map((p) => p.seat);

async function analyseStoredGame(db: Db, gameId: string): Promise<void> {
  const game = await db.game.findUnique({ where: { id: gameId }, select: { status: true, analysis: true, players: { select: { seat: true, isBot: true, userId: true, guestSessionId: true } } } });
  if (!game || game.status !== 'finished' || game.analysis !== null) return;
  const data = await loadReplayData(db, gameId);
  if (!data || !data.steps.length) return;
  const analysis = await analyseInWorker(data, { prioritySeats: humanSeats(game.players) });
  await saveAnalysis(db, gameId, analysis);
}

/**
 * Runs the analysis in a worker thread. The server runs on tsx, which a worker doesn't inherit: the
 * worker first registers tsx's loader, then imports its (TypeScript) entry.
 */
export function analyseInWorker(data: ReplayData, options: AnalysisOptions = {}): Promise<GameAnalysis> {
  let api = 'tsx/esm/api';
  try {
    api = import.meta.resolve('tsx/esm/api');
  } catch {
    // Resolved from the working directory instead.
  }
  const entry = new URL('./analysisWorker.ts', import.meta.url).href;
  const boot = `import(${JSON.stringify(api)}).then(({ register }) => { register(); return import(${JSON.stringify(entry)}); });`;
  const maxMs = options.maxMs ?? ANALYSIS_DEFAULTS.maxMs;
  return new Promise((resolve, reject) => {
    const worker = new Worker(boot, {
      eval: true,
      workerData: { data, options, idleRatio: ANALYSIS_IDLE_RATIO },
      resourceLimits: { maxOldGenerationSizeMb: 192 },
    });
    // The analysis keeps its own time budget; this only catches a worker that hangs.
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new Error('analysis worker timed out'));
    }, maxMs * (1 + ANALYSIS_IDLE_RATIO) * 2 + 30_000);
    worker.once('message', (msg: { ok: true; analysis: GameAnalysis } | { ok: false; error: string }) => {
      clearTimeout(timer);
      void worker.terminate();
      if (msg.ok) resolve(msg.analysis);
      else reject(new Error(msg.error));
    });
    worker.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    worker.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`analysis worker exited (${code})`));
    });
  });
}

type NudgeRow = SeatRow & { id: string; ratingDelta: number | null; ratingPool: string | null; accuracyElo: number | null };

/**
 * Elo nudges for a finished analysis. Only rated players (a rating change was recorded for this game),
 * only seats they played to the end, only with every one of their decisions analysed (enough of them),
 * and never twice: a row that already has `accuracyElo` is skipped.
 */
export function planEloNudges(players: NudgeRow[], analysis: GameAnalysis): { playerId: string; userId: string; pool: string; delta: number }[] {
  const out = [];
  for (const p of players) {
    if (!p.userId || p.isBot || p.ratingDelta === null || !p.ratingPool || p.accuracyElo !== null) continue;
    const a = analysis.players[p.seat];
    if (!a || !a.complete || a.accuracy === null || a.analysed < MIN_RATED_DECISIONS) continue;
    out.push({ playerId: p.id, userId: p.userId, pool: p.ratingPool, delta: accuracyEloNudge(a.accuracy) });
  }
  return out;
}

/** Stores the analysis once (a second save for the same game does nothing) and applies the nudges. */
export async function saveAnalysis(db: Db, gameId: string, analysis: GameAnalysis): Promise<void> {
  await db.$transaction(async (tx) => {
    const claimed = await tx.game.updateMany({ where: { id: gameId, analysis: { equals: Prisma.DbNull } },
      data: { analysis: JSON.parse(JSON.stringify(analysis)), analysedAt: new Date() } });
    if (!claimed.count) return;
    const players = await tx.player.findMany({ where: { gameId }, orderBy: { seat: 'asc' } });
    for (const p of players) {
      const a = analysis.players[p.seat];
      if (a?.accuracy == null) continue;
      await tx.player.update({ where: { id: p.id }, data: { accuracy: a.accuracy, inaccuracies: a.inaccuracies, mistakes: a.mistakes, blunders: a.blunders } });
    }
    const nudges = planEloNudges(players, analysis);
    if (!nudges.length) return;
    await lockIdentities(tx, players);
    for (const n of nudges) {
      // Recorded even when it is 0, so the row shows the adjustment was settled.
      const settled = await tx.player.updateMany({ where: { id: n.playerId, accuracyElo: null }, data: { accuracyElo: n.delta } });
      if (!settled.count || !n.delta) continue;
      const rating = await tx.playerRating.findUnique({ where: { userId_poolKey: { userId: n.userId, poolKey: n.pool } } });
      if (!rating) continue;
      const after = rating.rating + n.delta;
      await tx.playerRating.update({ where: { userId_poolKey: { userId: n.userId, poolKey: n.pool } }, data: { rating: after, peakRating: Math.max(rating.peakRating, after) } });
    }
  }, { timeout: 30_000 });
}

/** GET /api/games/:id/analysis, for anyone at the game's table; null when there is no such game for them. */
export async function analysisFor(identity: ServerIdentity, gameId: string): Promise<AnalysisStatus | null> {
  const db = getDb();
  if (!db || !/^[a-zA-Z0-9-]{1,100}$/.test(gameId)) return null;
  const game = await db.game.findFirst({ where: { id: gameId, status: 'finished', ...tableMember(identity) },
    select: { analysis: true, endedAt: true, players: { select: { seat: true, accuracyElo: true }, orderBy: { seat: 'asc' } } } });
  if (!game) return null;
  if (game.analysis) return { status: 'ready', analysis: game.analysis as unknown as GameAnalysis, elo: game.players.map((p) => p.accuracyElo) };
  const justEnded = !!game.endedAt && Date.now() - game.endedAt.getTime() < JUST_ENDED_MS;
  return analysisEnabled() && (waiting.has(gameId) || justEnded) ? { status: 'pending' } : { status: 'unavailable' };
}
