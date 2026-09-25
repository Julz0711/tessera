'use client';

import { useEffect } from 'react';
import { usePrefs } from '@/client/prefs';

/** Loads the per-browser preferences once, on whichever page the app is opened. Renders nothing. */
export function PrefsLoader() {
  const load = usePrefs((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);
  return null;
}
