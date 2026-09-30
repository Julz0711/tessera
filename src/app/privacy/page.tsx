import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { APP_NAME } from '@/config/app';
import { LEGAL_ADDRESS, LEGAL_EMAIL, LEGAL_OPERATOR } from '@/config/legal';
import { LegalPage } from '@/components/landing/LegalPage';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function Page() {
  return (
    <LegalPage title="Privacy policy" icon={<ShieldCheck size={30} className="text-amber" />}>
      <p>
        {APP_NAME} is a free hobby project for playing a board game with friends in the browser. We collect as little as
        we can: no ads, no analytics, no tracking. This page explains what the game does store and why.
      </p>

      <section>
        <h2>Who is responsible</h2>
        <p>
          {LEGAL_OPERATOR}
          <br />
          {LEGAL_ADDRESS}
          <br />
          Email: <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>
        </p>
        <p>This person is the controller under the EU General Data Protection Regulation (GDPR).</p>
      </section>

      <section>
        <h2>What we store</h2>
        <ul>
          <li>
            <strong>Playing as a guest.</strong> A random guest id in a cookie, plus the name, colour and knight you pick,
            and how many games you played and won.
          </li>
          <li>
            <strong>Signing in</strong> with Google or Discord. We get your name, email address, profile picture and an
            account id from that provider. We do not keep their access tokens, and your email is never shown to other
            players.
          </li>
          <li>
            <strong>Your profile.</strong> Display name, colour, knight, avatar, frame and title, settings, games played and
            won, rating, and your friend code and friend list.
          </li>
          <li>
            <strong>Knight portraits</strong> you upload (small images, at most 64 KB). Only upload pictures you have the
            right to use. Don&apos;t upload photos of other people without their consent.
          </li>
          <li>
            <strong>Games.</strong> Room settings, who sat where, every move, the final score and rating changes.
          </li>
          <li>
            <strong>Chat.</strong> Chat messages are kept in the server&apos;s memory only while the room is open. They are not
            written to the database.
          </li>
          <li>
            <strong>Technical data.</strong> Your IP address is used briefly in memory to rate-limit abuse (for example,
            creating many guests at once). Our hosting provider may keep standard server logs.
          </li>
        </ul>
      </section>

      <section>
        <h2>Why, and on what legal basis</h2>
        <ul>
          <li>
            To run the game, your account, friends list and stats you asked for: performance of our agreement with you
            (Art. 6(1)(b) GDPR).
          </li>
          <li>
            To keep the service secure and stop cheating, spam and abuse: our legitimate interest in a working, fair game
            (Art. 6(1)(f) GDPR).
          </li>
        </ul>
        <p>We never sell your data, and we don&apos;t use it for advertising or profiling.</p>
      </section>

      <section>
        <h2>Cookies and local storage</h2>
        <p>We only use what the game needs to work, so there is no cookie banner:</p>
        <ul>
          <li>
            <code>guest_session</code>: keeps you the same guest between visits. Expires after 30 days.
          </li>
          <li>
            <code>authjs.session-token</code> and short-lived <code>authjs.*</code> sign-in cookies: keep you signed in (up
            to 30 days).
          </li>
          <li>Your browser&apos;s local storage: your settings and which patch notes you&apos;ve seen. This stays on your device.</li>
        </ul>
        <p>Fonts are served from our own server, so loading a page makes no requests to Google.</p>
      </section>

      <section>
        <h2>Who can see it</h2>
        <ul>
          <li>
            <strong>Other players</strong> see your display name, colour, knight, portrait, frame and title, and your chat
            messages in their room. Anyone can see the names and ratings on the leaderboard.
          </li>
          <li>
            <strong>Service providers</strong> who process data for us: Render (hosting, EU region Frankfurt) and Neon
            (database, EU region Frankfurt). Google or Discord handle the sign-in if you use them, under their own
            privacy policies.
          </li>
        </ul>
        <p>
          Some of these companies are based in the United States. Where data leaves the EU, the transfer relies on the
          EU–U.S. Data Privacy Framework or the European Commission&apos;s standard contractual clauses.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <ul>
          <li>Account and profile data: until you ask us to delete your account.</li>
          <li>Guest data: the cookie expires after 30 days. The guest record can be deleted on request.</li>
          <li>
            Game records: kept for history and ratings. When we process account or guest deletion, we remove stored
            account links, replace your name and portrait in game summaries, and remove the affected games&apos; move
            logs and recovery snapshots. Other players can still see the scores.
          </li>
          <li>Uploaded portraits: removed when no retained records reference them. Shared images need individual review.</li>
          <li>Chat: gone when the room closes or the server restarts.</li>
        </ul>
        <p>
          Deletion from the live database does not immediately remove copies in hosting-provider backups or copies
          already downloaded by other players. Contact us for details about your request.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can ask for a copy of your data, and to correct it, delete it, restrict its use or take it with you. You can
          also object to processing based on legitimate interest. Email <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
          You also have the right to complain to a data protection supervisory authority, such as the one where you live.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          {APP_NAME} is not meant for children under 16 without a parent&apos;s permission. If you believe a child has given us
          data without it, contact us and we will delete it.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes, we update the date at the top. See also our <Link href="/terms">terms</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
