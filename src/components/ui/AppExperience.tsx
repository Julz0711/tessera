'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Download, PlusSquare, Share, Smartphone, WifiOff } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/config/app';
import { Modal } from './Modal';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallContext = createContext({ installed: false, open: () => {} });

/** Whether the app already runs installed, and how to open the install guide. */
export const useAppInstall = () => useContext(InstallContext);

export function InstallAppButton({ className = 'btn btn-dark px-4 py-2 text-sm' }: { className?: string }) {
  const { installed, open } = useAppInstall();
  if (installed) return null;
  return <button type="button" className={className} onClick={open}><Smartphone size={17} /> Add to Home Screen</button>;
}

/** One install lifecycle for the entire app; never interrupts a live game to update. */
export function AppExperience({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [offline, setOffline] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const display = matchMedia('(display-mode: standalone)');
    const syncDisplay = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const syncNetwork = () => setOffline(!navigator.onLine);
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setOpen(false); setPrompt(null); };
    syncDisplay();
    syncNetwork();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    display.addEventListener('change', syncDisplay);
    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // Visual viewport tracks the iOS keyboard, which does not always resize 100dvh.
    const viewport = window.visualViewport;
    const syncViewport = () => {
      if (viewport && viewport.scale === 1) {
        document.documentElement.style.setProperty('--visible-height', `${viewport.height}px`);
        document.documentElement.style.setProperty('--visible-top', `${viewport.offsetTop}px`);
      }
    };
    syncViewport();
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    return () => {
      display.removeEventListener('change', syncDisplay);
      window.removeEventListener('online', syncNetwork);
      window.removeEventListener('offline', syncNetwork);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    let cleanup = () => {};
    void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((registration) => {
      if (cancelled) return;
      const checkWaiting = () => { if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting); };
      const onUpdate = () => registration.installing?.addEventListener('statechange', checkWaiting);
      checkWaiting();
      registration.addEventListener('updatefound', onUpdate);
      cleanup = () => registration.removeEventListener('updatefound', onUpdate);
    }).catch(() => { /* Installation remains available if offline support is unavailable. */ });
    return () => { cancelled = true; cleanup(); };
  }, []);

  const install = async () => {
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setOpen(false);
    } finally { setPrompt(null); setInstalling(false); }
  };

  return (
    <InstallContext.Provider value={{ installed, open: () => setOpen(true) }}>
      {children}
      {offline && !pathname.startsWith('/r/') && <div className="app-notice" role="status"><WifiOff size={18} /> You’re offline. Reconnect to play with your table.</div>}
      {waiting && !offline && !pathname.startsWith('/r/') && <div className="app-notice" role="status">An app update is ready.<button className="btn btn-primary px-3 py-2" onClick={() => {
        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
        waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
      }}>Update</button><button className="px-2 py-3 underline" onClick={() => setWaiting(null)}>Later</button></div>}
      <Modal open={open} onClose={() => setOpen(false)} title={`Take ${APP_NAME} with you`}>
        <div className="grid gap-5">
          <div className="flex items-center gap-4"><img src="/icons/apple-touch-icon.png" width={64} height={64} alt="" className="rounded-2xl" /><p className="text-sm text-ink-soft">Your table, one tap away. Add the app to your Home Screen for a full-screen game.</p></div>
          {prompt ? <button className="btn btn-primary w-full py-3" disabled={installing} onClick={() => void install().catch(() => setInstalling(false))}><Download size={18} /> {installing ? 'Installing…' : `Install ${APP_NAME}`}</button> : ios ? (
            <ol className="install-steps">
              <li><Share size={21} /><span>Open this page in <b>Safari</b> and tap <b>Share</b> (in the More menu on some versions).</span></li>
              <li><PlusSquare size={21} /><span>Choose <b>Add to Home Screen</b>. Scroll down if you don’t see it.</span></li>
              <li><Smartphone size={21} /><span>Keep <b>Open as Web App</b> on if shown, then tap <b>Add</b>.</span></li>
            </ol>
          ) : <p className="rounded-xl border-2 border-ink bg-paper-2 p-4 text-sm">Open your browser’s menu and choose <b>Install app</b> or <b>Add to Home Screen</b>. On iPhone or iPad, open this page in Safari, tap Share, then Add to Home Screen.</p>}
          <p className="text-xs text-ink-faint">Free, with no App Store download. An internet connection is needed to play. Install before starting a game; your browser and installed app may use separate guest profiles. Sign in to use the same profile everywhere.</p>
        </div>
      </Modal>
    </InstallContext.Provider>
  );
}
