import type { Metadata } from 'next';
import { SavedGameReplay } from '@/components/profile/SavedGameReplay';
export const metadata: Metadata = { title: 'Replay', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SavedGameReplay key={id} gameId={id} />;
}
