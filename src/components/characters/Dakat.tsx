import { Face } from './Face';
import type { CharacterProps } from './types';

// Dakat — fierce bandit: red headscarf/turban, huge mustache, cheek scar. Not masked
// (that's the Chor); this one's face is bare and menacing.
export function Dakat({ expression = 'neutral', size = 96, className, title }: CharacterProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={['animate-wobble', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={title ?? 'Dakat'}
    >
      {title && <title>{title}</title>}
      <circle cx={50} cy={56} r={27} fill="#cf9c6e" stroke="var(--ink)" strokeWidth={2.5} />
      {/* Tied red headscarf with a knotted tail to the side */}
      <path
        d="M20 40 q30 -24 60 0 q-6 -16 -30 -16 q-24 0 -30 16 Z"
        fill="var(--vermilion)"
        stroke="var(--ink)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path d="M20 40 q30 8 60 0" fill="none" stroke="var(--vermilion-dark)" strokeWidth={2.5} />
      <path d="M78 38 q12 -2 16 6 q-9 3 -16 -2 Z" fill="var(--vermilion-dark)" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
      {/* Cheek scar */}
      <path d="M68 58 l5 9 M70 60 l-3 2 M73 64 l-3 2" stroke="var(--ink)" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      {/* Angry brows */}
      <path d="M38 50 q5 2 9 5 M62 50 q-5 2 -9 5" fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
      {/* Big fierce handlebar mustache */}
      <path
        d="M50 70 q-10 2 -16 -4 q-3 8 6 9 q7 1 10 -3 q3 4 10 3 q9 -1 6 -9 q-6 6 -16 4 Z"
        fill="var(--ink)"
        stroke="var(--ink)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Face expression={expression} cy={58} />
    </svg>
  );
}
