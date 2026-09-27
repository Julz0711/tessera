import Link from 'next/link';
import { startSignIn } from '@/client/auth';
import { DiscordMark, GoogleMark } from '@/components/ui/Glyphs';

/**
 * Lists the providers this server has configured; each one hides itself when unset. `null` while
 * the session is still loading, or when it couldn't be fetched (`failed`).
 */
export function SignInChoices({ auth, failed }: { auth: { google: boolean; discord: boolean } | null; failed?: boolean }) {
  if (!auth) {
    return <p className="text-sm text-ink-soft">{failed ? "Couldn't reach the server. Try again in a moment." : 'Loading…'}</p>;
  }
  if (!auth.google && !auth.discord) {
    return <p className="text-sm text-ink-soft">Sign-in isn&apos;t configured on this server yet. You can keep playing as a guest.</p>;
  }
  return (
    <div className="grid gap-2">
      {auth.google && (
        <button type="button" className="btn justify-start px-4 py-3" onClick={() => startSignIn('google')}>
          <GoogleMark size={20} /> Continue with Google
        </button>
      )}
      {auth.discord && (
        <button type="button" className="btn justify-start px-4 py-3" onClick={() => startSignIn('discord')}>
          <DiscordMark size={20} /> Continue with Discord
        </button>
      )}
      <p className="mt-1 text-xs text-ink-faint">
        By signing in you agree to the <Link href="/terms" className="underline">terms</Link> and{' '}
        <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </div>
  );
}
