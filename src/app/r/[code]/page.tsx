import type { Metadata } from 'next';
import { RoomScreen } from '@/components/room/RoomScreen';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const c = code.toUpperCase();
  return { title: `Room ${c.slice(0, 4)}-${c.slice(4)}`, robots: { index: false } };
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomScreen code={code} />;
}
