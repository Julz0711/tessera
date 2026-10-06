import type { Metadata } from 'next';
import { ScrollText } from 'lucide-react';
import Link from 'next/link';
import { APP_NAME } from '@/config/app';
import { LEGAL_COUNTRY, LEGAL_EMAIL, LEGAL_OPERATOR } from '@/config/legal';
import { LegalPage } from '@/components/landing/LegalPage';

export const metadata: Metadata = { title: 'Terms of use' };

export default function Page() {
  return (
    <LegalPage title="Terms of use" icon={<ScrollText size={30} className="text-ink" />}>
      <p>
        These terms apply when you use {APP_NAME} (&quot;the game&quot;), which is run by {LEGAL_OPERATOR} (&quot;we&quot;). By
        playing, as a guest or with an account, you agree to them. Please read them together with our{' '}
        <Link href="/privacy">privacy policy</Link>.
      </p>

      <section>
        <h2>A free hobby project</h2>
        <p>
          The game is free and is run as a hobby. We try to keep it running, but we can&apos;t promise it will always be
          available or bug-free. We may change features, reset ratings or stats, or shut the game down at any time.
          Games in progress may be lost, for example when the server restarts.
        </p>
      </section>

      <section>
        <h2>Who can play</h2>
        <p>You must be at least 16, or have a parent or guardian&apos;s permission.</p>
      </section>

      <section>
        <h2>Accounts</h2>
        <p>
          You can play as a guest or sign in with Google or Discord. Keep your sign-in account secure. You are responsible
          for what happens under your account.
        </p>
      </section>

      <section>
        <h2>Play fair and be kind</h2>
        <p>Please don&apos;t:</p>
        <ul>
          <li>harass, threaten or insult other players, or post hateful, sexual or otherwise illegal content in names, portraits or chat;</li>
          <li>pretend to be someone else;</li>
          <li>cheat, use bugs to gain an advantage, or run bots or scripts against the game;</li>
          <li>try to break, overload or get around the security of the service;</li>
          <li>upload images you don&apos;t have the rights to, or photos of other people without their consent.</li>
        </ul>
        <p>
          We may remove content, reset names or portraits, or suspend or block players who break these rules. If you find a
          bug, please tell us instead of using it.
        </p>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          You keep the rights to names, portraits and messages you add. You allow us to store them and show them to other
          players in the game, for as long as they are on the service.
        </p>
      </section>

      <section>
        <h2>Our content and other trademarks</h2>
        <p>
          The game&apos;s code, graphics and texts belong to us or their licensors. {APP_NAME} is an independent project. It is
          not affiliated with, endorsed or sponsored by any board game publisher, and all trademarks belong to their
          owners.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          The game is provided free of charge and &quot;as is&quot;. We are liable without limit for damage we cause
          intentionally or through gross negligence, and for injury to life, body or health. Beyond that, we are not
          liable for damage from using the game, such as lost games, stats or ratings, as far as the law allows.
        </p>
      </section>

      <section>
        <h2>Ending</h2>
        <p>
          You can stop playing at any time and ask us to delete your account at{' '}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. We can end or suspend access, for example for breaking these
          terms.
        </p>
      </section>

      <section>
        <h2>Changes and law</h2>
        <p>
          We may update these terms. The date at the top shows the latest version, and continuing to play means you accept
          it. The law of {LEGAL_COUNTRY} applies. If you are a consumer, you keep the protection of the mandatory laws of
          the country where you live.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>
        </p>
      </section>
    </LegalPage>
  );
}
