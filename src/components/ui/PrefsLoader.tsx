'use client';

import { useEffect } from 'react';
import { usePrefs } from '@/client/prefs';

/** Loads the per-browser preferences once, on whichever page the app is opened, and mirrors the Animations one onto <html>. Renders nothing. */
export function PrefsLoader() {
  const load = usePrefs((s) => s.load);
  const motion = usePrefs((s) => s.motion);
  useEffect(() => {
    load();
  }, [load]);
  // The Animations preference, for the reduced-motion rules in globals.css.
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);
  return null;
}
