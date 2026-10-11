/**
 * Worker thread entry for the game analysis (see gameAnalysis.ts): runs the CPU-heavy search away from
 * the event loop, so the game rooms never wait on it, and idles between decisions to share a small CPU.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { analyseGame, type AnalysisOptions } from '@/bots/analysis/analyse';
import type { ReplayData } from '@/engine/replay';

const { data, options, idleRatio } = workerData as { data: ReplayData; options: AnalysisOptions; idleRatio: number };
const sleeper = new Int32Array(new SharedArrayBuffer(4));
const pause = (busyMs: number) => {
  const ms = Math.min(250, busyMs * idleRatio);
  if (ms >= 1) Atomics.wait(sleeper, 0, 0, ms);
};
try {
  parentPort!.postMessage({ ok: true, analysis: analyseGame(data, { ...options, pause: idleRatio > 0 ? pause : undefined }) });
} catch (err) {
  parentPort!.postMessage({ ok: false, error: err instanceof Error ? (err.stack ?? err.message) : String(err) });
}
