export interface AvatarPreset {
  id: string;
  seed: string;
  style: string;
  name: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'cyber', seed: 'CyberTrader', style: 'avataaars', name: 'Cyber Trader' },
  { id: 'neon', seed: 'NeonRogue', style: 'adventurer', name: 'Neon Rogue' },
  { id: 'gold', seed: 'GoldQueen', style: 'lorelei', name: 'Gold Queen' },
  { id: 'bull', seed: 'PixelBull', style: 'pixel-art', name: 'Pixel Bull' },
  { id: 'mech', seed: 'MechUnit', style: 'bottts', name: 'Mech Unit' },
  { id: 'wiz', seed: 'ChartWizard', style: 'notionists', name: 'Chart Wizard' },
  { id: 'ape', seed: 'DegenApe', style: 'fun-emoji', name: 'Degen Ape' },
  { id: 'snipe', seed: 'ShadowSnipe', style: 'personas', name: 'Shadow Snipe' },
  { id: 'kid', seed: 'ClashKid', style: 'miniavs', name: 'Clash Kid' },
  { id: 'diamond', seed: 'DiamondHands', style: 'open-peeps', name: 'Diamond Hands' },
  { id: 'cat', seed: 'LuckyCat', style: 'croodles', name: 'Lucky Cat' },
  { id: 'rogue2', seed: 'NeonRogue2', style: 'big-smile', name: 'Hype Beast' },
];

export const AVATAR_STORAGE_KEY = 'mindclash_avatar_id';

export function avatarUrl(preset: AvatarPreset): string {
  return `https://api.dicebear.com/7.x/${preset.style}/svg?seed=${encodeURIComponent(preset.seed)}&backgroundColor=0c0f17`;
}

export function getAvatarById(id: string): AvatarPreset {
  return AVATAR_PRESETS.find(p => p.id === id) ?? AVATAR_PRESETS[0];
}
