'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const ShowcaseIsland = dynamic(() => import('./ShowcaseIsland'), { ssr: false });

/**
 * The landing page's 3D island, mounted above the routes so returning home shows it at once instead
 * of rebuilding it. Away from home it stays alive but hidden with its render loop stopped; in a game
 * (`/r/…`) it is torn down so the table gets the whole GPU.
 */
export function HomeBackdrop() {
  const pathname = usePathname();
  const home = pathname === '/';
  const [visited, setVisited] = useState(home);
  if (home && !visited) setVisited(true);
  if (!visited || pathname.startsWith('/r/')) return null;
  return (
    <div className="fixed inset-0 bg-sea-950" style={{ visibility: home ? 'visible' : 'hidden' }} aria-hidden>
      <ShowcaseIsland paused={!home} />
    </div>
  );
}
