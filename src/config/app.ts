/**
 * Product/brand configuration — the ONLY place the product name lives.
 * The product is called Tessera; override with NEXT_PUBLIC_APP_NAME to rename the product
 * without touching game logic, the database, or individual UI components.
 */
export const APP_NAME: string = process.env.NEXT_PUBLIC_APP_NAME || "Tessera";

export const APP_TAGLINE = "Play strategy games with friends.";

export const APP_DESCRIPTION =
  "A free, browser-based 3D strategy board game for friend groups. Create a private room, share the link, and start playing in a minute.";

/** Upper-case wordmark used on the landing page. */
export const APP_WORDMARK = APP_NAME.toUpperCase();

/**
 * Release stage shown next to the name (home screen, in-game top bar). Set to null once the game
 * leaves beta.
 */
export const APP_STAGE: string | null = "Beta";

export const APP_STAGE_NOTE = "Still in beta: expect changes and the odd bug.";
