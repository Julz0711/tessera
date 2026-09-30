/** Validate configuration without including private values in build errors. */
export function validateLegalEnvironment(env: Record<string, string | undefined>): void {
  const required = ['NEXT_PUBLIC_LEGAL_OPERATOR', 'NEXT_PUBLIC_LEGAL_ADDRESS', 'NEXT_PUBLIC_LEGAL_EMAIL'] as const;
  const invalid = required.filter((key) => {
    const value = env[key]?.trim();
    return !value || /^\[.*\]$/.test(value) || /^(todo|changeme|placeholder)$/i.test(value);
  });
  const email = env.NEXT_PUBLIC_LEGAL_EMAIL?.trim();
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) && !invalid.includes('NEXT_PUBLIC_LEGAL_EMAIL')) {
    invalid.push('NEXT_PUBLIC_LEGAL_EMAIL');
  }
  if (invalid.length) {
    throw new Error(`Set real operator details before building for production: ${invalid.join(', ')}. See .env.example. These values are public and embedded at build time.`);
  }
}
