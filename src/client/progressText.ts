import type { ProgressCardType, Track } from '@/engine/types';

export const PROGRESS_TEXT: Record<ProgressCardType, string> = {
  alchemist: 'Before rolling: choose the red and yellow dice yourself.',
  crane: 'Your next city improvement this turn costs 1 commodity less.',
  engineer: 'Build a city wall for free.',
  inventor: 'Swap two number tokens (not 2, 12, 6 or 8).',
  irrigation: 'Take 2 grain for every fields hex next to your buildings.',
  medicine: 'Upgrade a settlement to a city for 2 ore + 1 grain.',
  mining: 'Take 2 ore for every mountains hex next to your buildings.',
  printer: 'Worth 1 victory point.',
  roadBuilding: 'Build 2 roads for free.',
  smith: 'Promote up to 2 knights for free.',
  bishop: 'Move the robber and steal a card from everyone next to it.',
  constitution: 'Worth 1 victory point.',
  deserter: "An opponent removes a knight; you may place one of equal strength, active if theirs was.",
  diplomat: "Remove an opponent's open road or ship, or move one of your own.",
  intrigue: 'Displace an opponent knight standing on your roads.',
  saboteur: 'Everyone with at least as many points as you discards half their hand.',
  spy: "Look at an opponent's progress cards and take one.",
  warlord: 'Activate all your knights for free.',
  wedding: 'Each player with more points gives you 2 cards of their choice.',
  commercialHarbor: 'Give each opponent a resource; they give you a commodity back.',
  masterMerchant: 'Look at the hand of a player with more points than you (a tie is not enough) and take 2 cards.',
  merchant: 'Place the merchant: 2:1 trades for that hex and +1 point while you hold it.',
  merchantFleet: 'This turn, trade one card type of your choice 2:1.',
  resourceMonopoly: 'Name a resource: each opponent gives you up to 2 of it.',
  tradeMonopoly: 'Name a commodity: each opponent gives you 1 of it.',
};

export const TRACK_STYLE: Record<Track, { color: string; ink: string; commodity: 'cloth' | 'coin' | 'paper'; ability: string; label: string }> = {
  trade: { color: '#e9c35a', ink: '#3a2a06', commodity: 'cloth', ability: 'Trading House: trade commodities 2:1', label: 'Trade' },
  politics: { color: '#3a74d8', ink: '#f3f7ff', commodity: 'coin', ability: 'Fortress: promote knights to mighty', label: 'Politics' },
  science: { color: '#3f9b4f', ink: '#f2fff4', commodity: 'paper', ability: 'Aqueduct: a resource when a roll gives you nothing', label: 'Science' },
};
