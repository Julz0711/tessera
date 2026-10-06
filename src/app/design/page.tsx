import type { Metadata } from 'next';
import { DesignPage } from '@/components/design/DesignPage';

export const metadata: Metadata = { title: 'Design language', robots: { index: false } };

export default function Page() {
  return <DesignPage />;
}
