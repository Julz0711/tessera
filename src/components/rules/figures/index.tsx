import type { ComponentType } from 'react';
import type { FigureId } from '@/config/rulebook';
import { BarbariansFigure } from './Barbarians';
import { CostsFigure } from './Costs';
import { DevCardsFigure } from './DevCards';
import { EventDieFigure } from './EventDie';
import { HarborsFigure } from './Harbors';
import { ImprovementsFigure } from './Improvements';
import { KnightsFigure } from './Knights';
import { LargestArmyFigure } from './LargestArmy';
import { LongestRoadFigure } from './LongestRoad';
import { OddsFigure } from './Odds';
import { ResourcesFigure } from './Resources';
import { RobberFigure } from './Robber';
import { SetupFigure } from './Setup';
import { ShipsFigure } from './Ships';
import { TurnFigure } from './Turn';

const FIGURES: Record<FigureId, ComponentType> = {
  resources: ResourcesFigure,
  odds: OddsFigure,
  setup: SetupFigure,
  turn: TurnFigure,
  costs: CostsFigure,
  longestRoad: LongestRoadFigure,
  harbors: HarborsFigure,
  robber: RobberFigure,
  devCards: DevCardsFigure,
  largestArmy: LargestArmyFigure,
  improvements: ImprovementsFigure,
  knights: KnightsFigure,
  eventDie: EventDieFigure,
  barbarians: BarbariansFigure,
  ships: ShipsFigure,
};

/** A rulebook picture, framed like a plate in a printed rulebook. */
export function RuleFigure({ id }: { id: FigureId }) {
  const Figure = FIGURES[id];
  return (
    <figure className="my-1 overflow-hidden rounded-xl border-2 border-ink/15 bg-paper-2 p-3" data-figure={id}>
      <Figure />
    </figure>
  );
}
