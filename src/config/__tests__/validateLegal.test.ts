import { describe, expect, it } from 'vitest';
import { validateLegalEnvironment } from '../validateLegal';

const valid = {
  NEXT_PUBLIC_LEGAL_OPERATOR: 'Test Operator',
  NEXT_PUBLIC_LEGAL_ADDRESS: 'Test Street 1, Test City',
  NEXT_PUBLIC_LEGAL_EMAIL: 'operator@example.test',
};

describe('production operator configuration', () => {
  it('accepts complete details', () => expect(() => validateLegalEnvironment(valid)).not.toThrow());
  it.each(['', '   ', '[operator name]', 'TODO'])('rejects missing or placeholder details: %s', (value) => {
    expect(() => validateLegalEnvironment({ ...valid, NEXT_PUBLIC_LEGAL_OPERATOR: value })).toThrow('NEXT_PUBLIC_LEGAL_OPERATOR');
  });
  it('rejects malformed email without printing its value', () => {
    const run = () => validateLegalEnvironment({ ...valid, NEXT_PUBLIC_LEGAL_EMAIL: 'private-invalid-value' });
    expect(run).toThrow('NEXT_PUBLIC_LEGAL_EMAIL');
    expect(run).not.toThrow('private-invalid-value');
  });
});
