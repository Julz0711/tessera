import type { Metadata } from 'next';
import { SavedGameReport } from '@/components/profile/SavedGameReport';
export const metadata: Metadata = { title: 'Match report', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SavedGameReport key={id} gameId={id} />;
}
