'use client';
import { useRouter } from 'next/navigation';
import { ReplayViewer } from '@/components/game/replay/ReplayViewer';

/** A finished game's replay outside any room (opened from the game history or the match report). */
export function SavedGameReplay({ gameId }: { gameId: string }) {
  const router = useRouter();
  // Back to wherever it was opened from; a fresh tab has no history, so go to the match report.
  return <ReplayViewer gameId={gameId} room={null} onClose={() => (window.history.length > 1 ? router.back() : router.push(`/games/${encodeURIComponent(gameId)}`))} />;
}
