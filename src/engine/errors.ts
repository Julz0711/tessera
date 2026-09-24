/** Thrown by rule handlers when an action is illegal; converted to `{ ok: false, error }`. */
export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleError';
  }
}

export function assertRule(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RuleError(message);
}
