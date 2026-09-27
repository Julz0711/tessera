/**
 * Who runs the site, for the privacy policy and terms (/privacy, /terms). Set these in the host's
 * environment before going public — the GDPR requires the controller's name and a contact address.
 * Unset values show as bracketed placeholders so a missing one is easy to spot.
 */
export const LEGAL_OPERATOR: string = process.env.NEXT_PUBLIC_LEGAL_OPERATOR || '[operator name]';

/** Postal address of the operator (required in the EU for the privacy policy's controller details). */
export const LEGAL_ADDRESS: string = process.env.NEXT_PUBLIC_LEGAL_ADDRESS || '[postal address]';

export const LEGAL_EMAIL: string = process.env.NEXT_PUBLIC_LEGAL_EMAIL || '[contact email]';

/** Country whose law governs the terms, e.g. "Germany". */
export const LEGAL_COUNTRY: string = process.env.NEXT_PUBLIC_LEGAL_COUNTRY || 'Germany';

/** Bump when either document changes (ISO date). */
export const LEGAL_UPDATED = '2026-09-27';
