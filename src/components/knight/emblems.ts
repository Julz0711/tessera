import type { Emblem } from '@/shared/knight';

/** SVG path data for path-based emblems, in a 20×20 box centred on (0,0). */
export const EMBLEM_PATHS: Partial<Record<Emblem, string>> = {
  eagle: 'M0-3 3-7l6 1-4 3 5 1-6 3 2 5-6-3-6 3 2-5-6-3 5-1-4-3 6-1Z',
  tower: 'M-5 8V-3h-1.5v-4h3v2h2v-2h3v2h2v-2h3v4H5V8H1.5V4a1.5 1.5 0 0 0-3 0v4Z',
  star: 'm0-8 2.4 5 5.5.6-4.1 3.8 1.1 5.4L0 4.1-4.9 6.8l1.1-5.4-4.1-3.8 5.5-.6Z',
  cross: 'M-2-8h4v5h5v4H2v7h-4V1h-5v-4h5Z',
  wolf: 'M-7-7-3-3h6l4-4v8L0 8-7 1Z',
};

/** Draws an emblem centred at the current origin of a 2D canvas (20-unit box). */
export function drawEmblem(g: CanvasRenderingContext2D, emblem: Emblem, fill: string): void {
  g.fillStyle = fill;
  const path = EMBLEM_PATHS[emblem];
  if (path) {
    g.fill(new Path2D(path));
    return;
  }
  const circle = (x: number, y: number, r: number) => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  if (emblem === 'lion') {
    g.globalAlpha = 0.55;
    circle(0, 0, 7);
    g.globalAlpha = 1;
    circle(0, 0, 4.2);
  } else if (emblem === 'rose') {
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 * Math.PI) / 180;
      circle(Math.sin(a) * 4, -Math.cos(a) * 4, 3.2);
    }
  } else if (emblem === 'sun') {
    circle(0, 0, 4);
    for (let i = 0; i < 8; i++) {
      g.save();
      g.rotate((i * Math.PI) / 4);
      g.fillRect(-0.9, -8.5, 1.8, 3.2);
      g.restore();
    }
  }
}
