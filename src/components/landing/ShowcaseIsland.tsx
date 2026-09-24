'use client';

import { useEffect, useState } from 'react';
import { botAction } from '@/bots';
import { applyAction, createGame, viewFor } from '@/engine';
import { NO_TARGETS, type BoardScene } from '@/components/board/types';
import { BoardView } from '@/components/board/BoardView';
import { DEFAULT_KNIGHT } from '@/shared/knight';

/** A random island with bot-placed starting pieces, for the landing page backdrop. */
function demoScene(seed: number): BoardScene {
  let s = createGame({
    seed,
    mode: 'classic',
    players: (['red', 'blue', 'orange', 'white'] as const).map((color, i) => ({ id: `d${i}`, name: `D${i}`, color, isBot: true })),
  });
  for (let guard = 0; s.phase === 'setup' && guard < 40; guard++) {
    const seat = s.setup!.order[s.setup!.index];
    const action = botAction(viewFor(s, seat), seat);
    if (!action) break;
    const r = applyAction(s, seat, action);
    if (!r.ok) break;
    s = r.state;
  }
  return {
    board: s.board,
    robber: s.robber,
    buildings: s.buildings,
    roads: s.roads,
    knights: s.knights,
    merchant: null,
    colors: s.players.map((p) => p.color),
    styles: s.players.map(() => DEFAULT_KNIGHT),
    myColor: null,
    highlightToken: null,
  };
}

export default function ShowcaseIsland() {
  const [scene, setScene] = useState<BoardScene | null>(null);
  useEffect(() => {
    setScene(demoScene(Math.floor(Math.random() * 2 ** 31)));
  }, []);
  if (!scene) return null;
  return <BoardView mode="3d" scene={scene} targets={NO_TARGETS} showcase quality="high" />;
}
