import { redirect } from 'next/navigation';

/** Progress lives in the profile now; old links land on its tab. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { tab } = await searchParams;
  redirect(tab === 'wardrobe' ? '/profile?tab=progress&view=wardrobe' : '/profile?tab=progress');
}
