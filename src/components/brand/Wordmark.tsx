type BrandProps = { size?: number; className?: string };

// Horizontal wordmark: text-only Baloo 2 800 "Chor Police" with an ink halo.
export function Wordmark({ size, className }: BrandProps) {
  return (
    <svg
      viewBox="0 0 632 124"
      width={size}
      height={size ? (size * 124) / 632 : undefined}
      className={className}
      role="img"
      aria-label="Chor Police"
    >
      <text
        x="8"
        y="96"
        fontWeight="800"
        fontSize="96"
        style={{ paintOrder: 'stroke', fontFamily: 'var(--font-baloo), sans-serif' }}
        stroke="#2b2118"
        strokeWidth="4"
      >
        <tspan fill="#e2483a">Chor</tspan>
        <tspan fill="#f4a01c"> Police</tspan>
      </text>
    </svg>
  );
}

// Stacked variant for square / vertical spaces. Text-only (no chit) and tightly
// cropped so it doesn't hog vertical space on a phone.
export function WordmarkStacked({ size, className }: BrandProps) {
  return (
    <svg
      viewBox="0 0 380 198"
      width={size}
      height={size ? (size * 198) / 380 : undefined}
      className={className}
      role="img"
      aria-label="Chor Police"
    >
      <text
        x="190"
        y="84"
        textAnchor="middle"
        fontWeight="800"
        fontSize="92"
        fill="#e2483a"
        style={{ paintOrder: 'stroke', fontFamily: 'var(--font-baloo), sans-serif' }}
        stroke="#2b2118"
        strokeWidth="4"
      >
        Chor
      </text>
      <text
        x="190"
        y="172"
        textAnchor="middle"
        fontWeight="800"
        fontSize="92"
        fill="#f4a01c"
        style={{ paintOrder: 'stroke', fontFamily: 'var(--font-baloo), sans-serif' }}
        stroke="#2b2118"
        strokeWidth="4"
      >
        Police
      </text>
    </svg>
  );
}
