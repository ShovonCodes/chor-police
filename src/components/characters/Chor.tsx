import type { CharacterProps } from './types';

export function Chor({ expression = 'neutral', size = 96, className, title }: CharacterProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={['animate-wobble', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={title ?? 'Chor'}
    >
      {title && <title>{title}</title>}
      <circle cx={50} cy={54} r={27} fill="#dcae84" stroke="var(--ink)" strokeWidth={2.5} />
      <path d="M22 40 q28 -30 56 0 q-10 -6 -28 -6 q-18 0 -28 6 Z" fill="var(--vermilion)" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M22 40 q4 6 10 6 M78 40 q-4 6 -10 6" fill="var(--vermilion-dark)" stroke="var(--ink)" strokeWidth={2} />
      <path d="M24 50 q26 10 52 0 l0 8 q-26 10 -52 0 Z" fill="var(--ink)" stroke="var(--ink)" strokeWidth={2} />
      {/* Eyes drawn after the mask band so they sit over it */}
      <g>
        {expression === 'caught' ? (
          <>
            <circle cx={43} cy={52} r={3.5} fill="#fff" />
            <circle cx={57} cy={52} r={3.5} fill="#fff" />
            <circle cx={43} cy={52} r={1.6} fill="var(--ink)" />
            <circle cx={57} cy={52} r={1.6} fill="var(--ink)" />
          </>
        ) : (
          <>
            <ellipse cx={43} cy={52} rx={3.5} ry={2.4} fill="#fff" />
            <ellipse cx={57} cy={52} rx={3.5} ry={2.4} fill="#fff" />
            <circle cx={44} cy={52} r={1.4} fill="var(--ink)" />
            <circle cx={58} cy={52} r={1.4} fill="var(--ink)" />
          </>
        )}
      </g>
      <g stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" fill="none">
        {expression === 'happy' && <path d="M42 70 q8 7 16 0" />}
        {(expression === 'neutral' || !expression) && <path d="M44 71 q6 4 12 0" />}
        {expression === 'sad' && <path d="M42 73 q8 -6 16 0" />}
        {expression === 'caught' && <ellipse cx={50} cy={71} rx={3.5} ry={4.5} fill="#fff" />}
      </g>
    </svg>
  );
}
