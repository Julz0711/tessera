import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { Logomark } from '@/components/ui/Logomark';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return (
    <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-4xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Home
          </Link>
          <Logomark size={28} />
        </div>
        <section className="paper animate-rise grid min-h-[32rem] p-5 sm:p-7">
          <h1 className="display mb-5 text-4xl font-black">Settings</h1>
          <SettingsPanel />
        </section>
      </div>
    </main>
  );
}
