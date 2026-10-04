import { BuildCostsCard } from '@/components/game/BuildCostsCard';

/** The building-costs card, as in the game. */
export function CostsFigure() {
  return (
    <div className="flex justify-center">
      <BuildCostsCard ck={false} ships={false} />
    </div>
  );
}
