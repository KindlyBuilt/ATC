interface Props { size?: number; className?: string }

export function Logo({ size = 28, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      aria-label="ATC Tools radar logo"
      className={className}
      data-testid="img-logo"
    >
      {/* outer radar ring */}
      <circle cx="24" cy="24" r="20" strokeWidth="1.6" opacity="0.55" />
      <circle cx="24" cy="24" r="13" strokeWidth="1" opacity="0.35" />
      <circle cx="24" cy="24" r="6" strokeWidth="1" opacity="0.5" />
      {/* crosshairs */}
      <line x1="24" y1="4" x2="24" y2="44" strokeWidth="0.8" opacity="0.3" />
      <line x1="4" y1="24" x2="44" y2="24" strokeWidth="0.8" opacity="0.3" />
      {/* sweep wedge */}
      <path d="M24 24 L24 4 A20 20 0 0 1 41.3 14 Z" fill="currentColor" opacity="0.18" stroke="none" />
      {/* aircraft mark */}
      <path
        d="M24 18 L31 25 L28 25 L24 22 L20 25 L17 25 Z"
        fill="currentColor"
        stroke="none"
        opacity="0.95"
      />
      <circle cx="24" cy="24" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
