import type { Expression } from './types';

export function Face({
  expression = 'neutral',
  cx = 50,
  cy = 50,
}: {
  expression?: Expression;
  cx?: number;
  cy?: number;
}) {
  const eyeY = cy - 4;
  return (
    <g stroke="var(--ink)" strokeWidth={2} strokeLinecap="round">
      {expression === 'happy' ? (
        <>
          <path d={`M${cx - 11} ${eyeY} q4 -5 8 0`} fill="none" />
          <path d={`M${cx + 3} ${eyeY} q4 -5 8 0`} fill="none" />
        </>
      ) : expression === 'caught' ? (
        <>
          <circle cx={cx - 7} cy={eyeY} r={4} fill="#fff" />
          <circle cx={cx + 7} cy={eyeY} r={4} fill="#fff" />
          <circle cx={cx - 7} cy={eyeY} r={1.8} fill="var(--ink)" stroke="none" />
          <circle cx={cx + 7} cy={eyeY} r={1.8} fill="var(--ink)" stroke="none" />
        </>
      ) : (
        <>
          <circle cx={cx - 7} cy={eyeY} r={2.2} fill="var(--ink)" stroke="none" />
          <circle cx={cx + 7} cy={eyeY} r={2.2} fill="var(--ink)" stroke="none" />
        </>
      )}

      {expression === 'happy' && (
        <path d={`M${cx - 8} ${cy + 8} q8 8 16 0`} fill="none" />
      )}
      {expression === 'neutral' && (
        <path d={`M${cx - 6} ${cy + 9} q6 3 12 0`} fill="none" />
      )}
      {expression === 'sad' && (
        <path d={`M${cx - 8} ${cy + 11} q8 -7 16 0`} fill="none" />
      )}
      {expression === 'caught' && (
        <ellipse cx={cx} cy={cy + 9} rx={4} ry={5} fill="#fff" />
      )}
    </g>
  );
}
