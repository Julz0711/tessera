import type { Metadata } from 'next';
import { PatchNotesPage } from '@/components/landing/PatchNotesPage';

export const metadata: Metadata = { title: 'Patch notes' };

export default function Page() {
  return <PatchNotesPage />;
}
