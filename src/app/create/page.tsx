import type { Metadata } from 'next';
import { CreateGame } from '@/components/create/CreateGame';

export const metadata: Metadata = { title: 'New game' };

export default function CreatePage() {
  return <CreateGame />;
}
