import type { Metadata } from 'next';
import { ProgressPage } from '@/components/progression/ProgressPage';

export const metadata: Metadata = { title: 'Progress' };

export default function Page() {
  return <ProgressPage />;
}
