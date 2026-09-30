/**
 * Quick reactions: a fixed set of emojis and short emotes a player can flash at the table. They're
 * ephemeral (never stored in the chat) and rate-limited on the server, so they can't be spammed.
 */
export const REACTIONS = [
  { id: 'thumbs', text: '👍', emote: false },
  { id: 'laugh', text: '😂', emote: false },
  { id: 'wow', text: '😮', emote: false },
  { id: 'angry', text: '😠', emote: false },
  { id: 'sad', text: '😢', emote: false },
  { id: 'party', text: '🎉', emote: false },
  { id: 'deal', text: '🤝', emote: false },
  { id: 'think', text: '🤔', emote: false },
  { id: 'clap', text: '👏', emote: false },
  { id: 'middlefinger', text: '🖕', emote: false },
  { id: 'heart', text: '❤️', emote: false },
  { id: 'cap', text: '🧢', emote: false },
  { id: 'gg', text: 'GG', emote: true },
  { id: 'nice', text: 'Nice!', emote: true },
  { id: 'oops', text: 'Oops', emote: true },
  { id: 'hurry', text: 'Hurry up!', emote: true },
] as const;

export type ReactionId = (typeof REACTIONS)[number]['id'];

export function isReactionId(value: unknown): value is ReactionId {
  return typeof value === 'string' && REACTIONS.some((r) => r.id === value);
}

export function reactionText(id: ReactionId): string {
  return REACTIONS.find((r) => r.id === id)!.text;
}

/** Short words ("GG") rather than a single emoji. */
export function isEmote(id: ReactionId): boolean {
  return REACTIONS.find((r) => r.id === id)!.emote;
}

/** How long a reaction bubble stays up, and the cooldown the client shows between reactions. */
export const REACTION_SHOW_MS = 3500;
export const REACTION_COOLDOWN_MS = 3000;

/** Minimum gap the client keeps between chat messages (the server enforces its own limit too). */
export const CHAT_COOLDOWN_MS = 1500;
