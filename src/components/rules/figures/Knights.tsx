import { KnightDisc } from './art-ck';

const KINDS = [
  { level: 1, name: 'Basic' },
  { level: 2, name: 'Strong' },
  { level: 3, name: 'Mighty' },
] as const;

/** Rulebook figure: basic, strong and mighty knights, each inactive (dim) and active (bright). */
export function KnightsFigure() {
  return (
    <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2">
      {KINDS.map((k) => (
        <div key={k.level} className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            <KnightDisc level={k.level} active={false} size={42} />
            <KnightDisc level={k.level} active size={42} />
          </div>
          <span className="label text-ink-soft">
            {k.name} · {k.level}
          </span>
        </div>
      ))}
    </div>
  );
}
