import { APP_STAGE, APP_STAGE_NOTE } from '@/config/app';

/** The release stage ("Beta") as a small tag beside the name; renders nothing once the game is out of beta. */
export function BetaBadge({ className = '' }: { className?: string }) {
  if (!APP_STAGE) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm border-2 border-ink bg-amber px-1.5 text-[10px] font-black uppercase leading-4 tracking-caps text-ink ${className}`}
      title={APP_STAGE_NOTE}
    >
      {APP_STAGE}
    </span>
  );
}
