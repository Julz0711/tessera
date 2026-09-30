'use client';
import { useCallback, useEffect, useState } from 'react';

/** Native history keeps filters bookmarkable without a server navigation per input. */
export function useUrlFilters(defaults: Record<string, string>) {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    const read = () => setParams(new URLSearchParams(window.location.search));
    read(); window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  const change = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '' || value === defaults[key]) next.delete(key); else next.set(key, value);
    }
    window.history.replaceState(null, '', `${window.location.pathname}${next.size ? `?${next}` : ''}`);
    setParams(next);
  }, [defaults]);
  return { params, change, get: (key: string) => params?.get(key) ?? defaults[key] ?? '' };
}
