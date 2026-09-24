import { APP_TAGLINE, APP_WORDMARK } from '@/config/app';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-5xl font-bold tracking-widest">{APP_WORDMARK}</h1>
      <p>{APP_TAGLINE}</p>
    </main>
  );
}
