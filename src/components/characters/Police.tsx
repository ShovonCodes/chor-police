import { Face } from './Face';
import type { CharacterProps } from './types';

// Police — blue/teal peaked cap with a gold star badge.
export function Police({ expression = 'neutral', size = 96, className, title }: CharacterProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={['animate-wobble', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={title ?? 'Police'}
    >
      {title && <title>{title}</title>}
      <circle cx={50} cy={58} r={26} fill="#e9c19a" stroke="var(--ink)" strokeWidth={2.5} />
      {/* Peaked cap brim */}
      <path
        d="M20 42 q30 12 60 0 q2 6 -4 9 q-26 8 -52 0 q-6 -3 -4 -9 Z"
        fill="#0c2f54"
        stroke="var(--ink)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* Cap crown */}
      <path d="M26 42 q24 -24 48 0 Z" fill="#1d5fa8" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
      {/* Cap band */}
      <path d="M26 42 q24 8 48 0" fill="none" stroke="var(--ink)" strokeWidth={2} />
      {/* Gold star badge */}
      <path
        d="M50 22 l2.4 5 5.4 .5 -4 4 1 5.4 -4.8 -2.6 -4.8 2.6 1 -5.4 -4 -4 5.4 -.5 Z"
        fill="var(--gold)"
        stroke="var(--ink)"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {/* Stern brows */}
      <path d="M40 50 q3 -3 7 -1 M53 49 q4 -2 7 1" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" />
      <Face expression={expression} cy={60} />
    </svg>
  );
}
