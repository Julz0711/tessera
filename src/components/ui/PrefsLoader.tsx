'use client';

import { useEffect } from 'react';
import { SYNCED_FIELDS, usePrefs } from '@/client/prefs';
import type { ProfileData } from '@/shared/protocol';
import { setSfxVolumes } from '@/client/sound';

const pick = (all: Record<string, unknown>) => Object.fromEntries(SYNCED_FIELDS.map((f) => [f, all[f]]));

/** Signed-in players: adopts the settings saved on their profile, then saves later changes back (debounced). Guests stay browser-only. */
function useProfileSync() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const res = await fetch('/api/profile', { credentials: 'same-origin' });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as ProfileData;
      if (data.session.kind !== 'user' || !data.session.persistence || cancelled) return;
      const store = usePrefs;
      if (!store.getState().loaded) store.getState().load();
      const remote = data.preferences as Record<string, unknown>;
      const remoteSynced = SYNCED_FIELDS.filter((f) => f in remote);
      store.getState().applyRemote(Object.fromEntries(remoteSynced.map((f) => [f, remote[f]])));
      let saved = JSON.stringify(pick(remote));
      const push = () => {
        const body = pick(store.getState() as unknown as Record<string, unknown>);
        const json = JSON.stringify(body);
        if (json === saved) return;
        saved = json;
        void fetch('/api/profile', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ preferences: body }),
        }).catch(() => {});
      };
      // First sync also uploads whatever this browser has that the profile doesn't yet (a fresh account, or the older three-field save).
      push();
      unsubscribe = store.subscribe(() => {
        clearTimeout(timer);
        timer = setTimeout(push, 800);
      });
    })().catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);
}

/** Loads the per-browser preferences once, on whichever page the app is opened, and mirrors the Animations one onto <html>. Renders nothing. */
export function PrefsLoader() {
  const load = usePrefs((s) => s.load);
  const motion = usePrefs((s) => s.motion);
  const sfxVolume = usePrefs((s) => s.sfxVolume);
  useEffect(() => {
    load();
  }, [load]);
  useProfileSync();
  // The Animations preference, for the reduced-motion rules in globals.css.
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);
  // Per-sound volumes apply app-wide, wherever a sound gets played from.
  useEffect(() => {
    setSfxVolumes(sfxVolume);
  }, [sfxVolume]);
  return null;
}
