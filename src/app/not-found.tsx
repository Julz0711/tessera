import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logomark } from '@/components/ui/Logomark';
import { APP_WORDMARK } from '@/config/app';

export const metadata: Metadata = { title: 'Page not found' };

/**
 * Any address that isn't a page. Room links have their own "room doesn't exist" message. Laid out like
 * the landing page (its header, the sea, the big display line and its keys), so it reads as the same app.
 */
export default function NotFound() {
  return (
    <main className="landing-page relative min-h-dvh overflow-hidden">
      {/* Its own sea: the landing page's island (HomeBackdrop) isn't there on a direct visit. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_72%_45%,#3a96a4_0%,#1d5f6d_42%,#0b2a33_85%)]" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-sea-950/95 via-sea-950/40 to-transparent max-md:bg-sea-950/55" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-sea-950 to-transparent" />

      <header className="landing-header relative z-10 flex items-center gap-2.5 px-5 pt-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${APP_WORDMARK} home`}>
          <Logomark size={30} />
          <span className="display text-lg font-black tracking-wide text-paper">{APP_WORDMARK}</span>
        </Link>
      </header>

      <section className="landing-hero relative z-10 flex flex-col justify-center px-5 pb-16 sm:px-10 md:max-w-160">
        <p className="label-light animate-rise">Page not found</p>
        <h1
          className="display animate-rise mt-2 text-[clamp(3.6rem,13vw,8.5rem)] font-black leading-[0.86] tracking-[-0.02em] text-paper"
          style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1, 'opsz' 144" }}
        >
          404
        </h1>
        <p className="animate-rise mt-5 max-w-md text-lg text-foam/80 [animation-delay:80ms]">
          Nothing on this shore. The link may be old or have a typo.
        </p>
        <div className="landing-actions animate-rise mt-9 flex flex-wrap items-center gap-3 [animation-delay:160ms]">
          <Link href="/" className="btn btn-primary px-7 py-3.5 text-lg">
            <ArrowLeft size={20} strokeWidth={3} /> Back home
          </Link>
          <Link href="/create" className="btn px-6 py-3.5 text-lg">
            Create game
          </Link>
        </div>
      </section>
    </main>
  );
}
