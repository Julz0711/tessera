import { RuleError } from '../errors';
import type { Ctx } from '../state';
import type { Action, Prompt } from '../types';

// Cities & Knights actions — implemented in Phase 6.
const CK_ACTIONS = new Set<Action['type']>([
  'buildKnight',
  'activateKnight',
  'promoteKnight',
  'moveKnight',
  'chaseRobber',
  'buildWall',
  'improveCity',
  'playProgress',
]);

export function isCkAction(action: Action): boolean {
  return CK_ACTIONS.has(action.type);
}

export function applyCkAction(_ctx: Ctx, _action: Action): void {
  throw new RuleError('Cities & Knights is not implemented yet');
}

export function resolveCkPrompt(_ctx: Ctx, _prompt: Prompt, _action: Action): void {
  throw new RuleError('Cities & Knights is not implemented yet');
}
