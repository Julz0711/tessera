import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { LEGAL_UPDATED } from '@/config/legal';
import { Logomark } from '@/components/ui/Logomark';

/** Shared frame for the privacy policy and terms: back link, title, date, and one paper card of prose. */
export function LegalPage({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const updated = new Date(`${LEGAL_UPDATED}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-2xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Home
          </Link>
          <Logomark size={28} />
        </div>
        <h1 className="display flex items-center gap-2 text-4xl font-black text-paper">
          {icon} {title}
        </h1>
        <article className="paper animate-rise grid gap-5 p-5 text-[15px] leading-relaxed sm:p-7 [&_a]:font-bold [&_a]:underline [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_li]:ml-5 [&_li]:list-disc [&_section]:grid [&_section]:gap-2 [&_ul]:grid [&_ul]:gap-1">
          <p className="text-sm font-bold text-ink-faint">
            Last updated <time dateTime={LEGAL_UPDATED}>{updated}</time>
          </p>
          {children}
        </article>
        <nav className="flex justify-center gap-4 text-sm font-bold text-foam/60">
          <Link href="/privacy" className="hover:text-paper">Privacy</Link>
          <Link href="/terms" className="hover:text-paper">Terms</Link>
          <Link href="/patch-notes" className="hover:text-paper">Patch notes</Link>
        </nav>
      </div>
    </main>
  );
}
