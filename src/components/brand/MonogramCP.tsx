type BrandProps = { size?: number; className?: string };

// CP monogram: Baloo 2 800 "CP" on a marigold roundel with an ink keyline.
export function MonogramCP({ size = 64, className }: BrandProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="CP monogram"
    >
      <circle cx="50" cy="50" r="45" fill="#f4a01c" stroke="#2b2118" strokeWidth="3" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#2b2118" strokeWidth="2" strokeDasharray="1.6 4" />
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontWeight="800"
        fontSize="50"
        fill="#2b2118"
        style={{ fontFamily: 'var(--font-baloo), sans-serif' }}
      >
        CP
      </text>
    </svg>
  );
}
