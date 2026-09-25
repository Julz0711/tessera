'use client';

import { useEffect } from 'react';
import { usePrefs, type Prefs } from '@/client/prefs';

const ROOT_FONT_SIZE: Record<Prefs['uiScale'], string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

/**
 * Applies the "Interface size" preference as the root font size, which scales every
 * rem-based Tailwind size. Renders nothing; mounted once in the root layout so it runs
 * on every page, applies on first load, and updates live when the setting changes.
 */
export function UiScale() {
  const load = usePrefs((s) => s.load);
  const uiScale = usePrefs((s) => s.uiScale);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.documentElement.style.fontSize = ROOT_FONT_SIZE[uiScale];
  }, [uiScale]);

  return null;
}
