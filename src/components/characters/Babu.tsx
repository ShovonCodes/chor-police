import { Face } from './Face';
import type { CharacterProps } from './types';

// Babu — regal/wealthy gentleman: gold crown-topi, jeweled brooch, fine mustache.
export function Babu({ expression = 'neutral', size = 96, className, title }: CharacterProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={['animate-wobble', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={title ?? 'Babu'}
    >
      {title && <title>{title}</title>}
      <circle cx={50} cy={54} r={28} fill="#f6c98a" stroke="var(--ink)" strokeWidth={2.5} />
      {/* Crown-topi: regal gold band with peaks and a centre jewel */}
      <path
        d="M26 30 L34 16 L42 27 L50 12 L58 27 L66 16 L74 30 Z"
        fill="var(--gold)"
        stroke="var(--ink)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <circle cx={50} cy={20} r={3.4} fill="var(--vermilion)" stroke="var(--ink)" strokeWidth={1.5} />
      <circle cx={34} cy={20} r={2} fill="var(--teal)" stroke="var(--ink)" strokeWidth={1.2} />
      <circle cx={66} cy={20} r={2} fill="var(--teal)" stroke="var(--ink)" strokeWidth={1.2} />
      <rect x={26} y={30} width={48} height={6} rx={2} fill="var(--marigold-dark)" stroke="var(--ink)" strokeWidth={2} />
      {/* Jeweled brooch under the chin */}
      <circle cx={50} cy={80} r={3.2} fill="var(--gold)" stroke="var(--ink)" strokeWidth={1.5} />
      {/* Curled noble mustache */}
      <path
        d="M40 66 q-7 5 -11 1 M60 66 q7 5 11 1"
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Face expression={expression === 'neutral' ? 'happy' : expression} cy={56} />
    </svg>
  );
}
