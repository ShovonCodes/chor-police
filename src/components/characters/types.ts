import type { Role } from '@/lib/game';

export type Expression = 'neutral' | 'happy' | 'sad' | 'caught';

export interface CharacterProps {
  expression?: Expression;
  size?: number;
  className?: string;
  title?: string;
}

export const ROLE_LABELS: Record<Role, { bn: string; roman: string; en: string }> = {
  babu: { bn: 'বাবু', roman: 'Babu', en: 'Boss' },
  police: { bn: 'পুলিশ', roman: 'Police', en: 'Police' },
  dakat: { bn: 'ডাকাত', roman: 'Dakat', en: 'Bandit' },
  chor: { bn: 'চোর', roman: 'Chor', en: 'Thief' },
};

// Mirrors the engine's ROLE_NUMBERS; for display only.
export const ROLE_NUMBERS: Record<Role, number> = {
  babu: 1000,
  police: 800,
  dakat: 600,
  chor: 400,
};

export const ROLE_COLOR: Record<Role, string> = {
  babu: 'var(--gold)',
  police: 'var(--teal)',
  dakat: 'var(--vermilion)',
  chor: 'var(--plum)',
};
