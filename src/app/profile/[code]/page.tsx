import type { Metadata } from 'next';
import { FriendProfilePage } from '@/components/profile/FriendProfilePage';

export const metadata: Metadata = { title: 'Friend profile', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <FriendProfilePage key={code} code={code} />;
}
