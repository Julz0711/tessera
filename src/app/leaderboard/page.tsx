import type { Metadata } from 'next';
import { LeaderboardPage } from '@/components/social/LeaderboardPage';

export const metadata: Metadata = { title: 'Leaderboard' };

export default function Page() {
  return <LeaderboardPage />;
}
