// Brand seal: red roundel + gold star (transparent background). Decorative.
export function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <circle cx="50" cy="52" r="30" fill="#e2483a" stroke="#2b2118" strokeWidth="3.5" />
      <circle cx="50" cy="52" r="30" fill="none" stroke="#e8b21e" strokeWidth="1.4" />
      <path
        d="M50 37 L53.8 46.7 L64.3 47.4 L56.2 54 L58.8 64.1 L50 58.5 L41.2 64.1 L43.8 54 L35.7 47.4 L46.2 46.7 Z"
        fill="#e8b21e"
        stroke="#2b2118"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
