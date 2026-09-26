import type { Metadata } from 'next';
import Link from 'next/link';
import { Logomark } from '@/components/ui/Logomark';

export const metadata: Metadata = { title: 'Page not found' };

/** Any address that isn't a page. Room links have their own "room doesn't exist" message. */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-10">
      <section className="paper animate-rise grid w-full max-w-sm justify-items-center gap-4 p-7 text-center">
        <Logomark size={56} />
        <div className="grid gap-1.5">
          <p className="label">404</p>
          <h1 className="display text-3xl font-black">Nothing here</h1>
          <p className="text-sm text-ink-soft">This page doesn&apos;t exist. The link may be old or have a typo.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary px-5 py-2.5">
            Home
          </Link>
          <Link href="/create" className="btn px-5 py-2.5">
            Create game
          </Link>
        </div>
      </section>
    </main>
  );
}
