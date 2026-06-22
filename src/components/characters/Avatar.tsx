const BACKINGS = [
  { fill: 'var(--marigold)', ring: 'var(--marigold-dark)' },
  { fill: 'var(--teal)', ring: '#0c4f4a' },
  { fill: 'var(--plum)', ring: '#3c1a5b' },
  { fill: 'var(--vermilion)', ring: 'var(--vermilion-dark)' },
];

export function Avatar({
  emoji,
  seat = 0,
  size = 56,
  dimmed = false,
  className,
}: {
  emoji: string;
  // 0..3 — picks the backing palette.
  seat?: number;
  size?: number;
  dimmed?: boolean;
  className?: string;
}) {
  const b = BACKINGS[seat % BACKINGS.length];
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        position: 'relative',
        width: size,
        height: size,
        opacity: dimmed ? 0.5 : 1,
      }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <circle cx={32} cy={32} r={29} fill={b.fill} stroke={b.ring} strokeWidth={3} />
        <circle cx={32} cy={32} r={29} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={1} strokeDasharray="3 4" />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: size * 0.5,
          lineHeight: 1,
        }}
      >
        {emoji}
      </span>
    </span>
  );
}
