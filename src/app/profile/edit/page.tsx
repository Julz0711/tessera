import type { Metadata } from 'next';
import { ProfileEditPage } from '@/components/profile/ProfileEditPage';

export const metadata: Metadata = { title: 'Edit profile' };

export default function Page() {
  return <ProfileEditPage />;
}
