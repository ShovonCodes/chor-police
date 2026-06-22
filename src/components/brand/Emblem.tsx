type BrandProps = { size?: number; className?: string };

// App-icon emblem: felt squircle holding a sealed paper chit with a gold-star seal.
export function Emblem({ size = 64, className }: BrandProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Chor Police emblem"
    >
      <rect x="3" y="3" width="94" height="94" rx="26" fill="#114a39" stroke="#2b2118" strokeWidth="3" />
      <rect x="11" y="11" width="78" height="78" rx="20" fill="none" stroke="#1a5c47" strokeWidth="2.5" />
      <g transform="rotate(-7 50 53)">
        <rect x="26" y="28" width="48" height="50" rx="8" fill="#fdf6e3" stroke="#2b2118" strokeWidth="3.2" />
        <path d="M26 44 L42 28 L26 28 Z" fill="#efdcae" stroke="#2b2118" strokeWidth="3.2" strokeLinejoin="round" />
        <circle cx="50" cy="57" r="11" fill="#e2483a" stroke="#2b2118" strokeWidth="3.2" />
        <path
          d="M50 50 l2.5 5.2 5.7 .6 -4.3 4 1.2 5.7 -5.1 -3 -5.1 3 1.2 -5.7 -4.3 -4 5.7 -.6 Z"
          fill="#e8b21e"
          stroke="#2b2118"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
