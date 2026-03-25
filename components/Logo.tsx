"use client";

/**
 * ScrapeCore Logo
 *
 * The logomark: A stylised lens/scope with a data-scraping "claw" motif.
 * Three curved prongs reach down (scraping), converging into a circular
 * lens (the "Core" — insight). The negative space forms an upward arrow,
 * representing actionable intelligence rising from raw data.
 *
 * Designed to work at any size from 16px favicon to full marketing hero.
 */

interface LogoProps {
  /** Render just the mark (no wordmark) */
  iconOnly?: boolean;
  /** Size of the icon square in px (default 32) */
  size?: number;
  /** Show the tagline under the wordmark */
  showTagline?: boolean;
  /** Additional className for the wrapper */
  className?: string;
}

/** The logomark SVG — a scope/lens with three converging scraper prongs */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ScrapeCore logo"
    >
      {/* Background rounded square */}
      <rect width="48" height="48" rx="12" fill="url(#sc-grad)" />

      {/* Three scraper prongs converging downward into the lens */}
      {/* Left prong */}
      <path
        d="M12 10 L12 20 Q12 26 18 28"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Center prong */}
      <path
        d="M24 8 L24 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      {/* Right prong */}
      <path
        d="M36 10 L36 20 Q36 26 30 28"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />

      {/* Small data dots at the tips of prongs */}
      <circle cx="12" cy="9" r="2" fill="white" opacity="0.5" />
      <circle cx="24" cy="7" r="2" fill="white" opacity="0.6" />
      <circle cx="36" cy="9" r="2" fill="white" opacity="0.5" />

      {/* Central lens / core circle */}
      <circle
        cx="24"
        cy="30"
        r="9"
        fill="white"
        fillOpacity="0.15"
        stroke="white"
        strokeWidth="2.5"
      />

      {/* Inner insight spark — a small starburst */}
      <circle cx="24" cy="30" r="3.5" fill="white" />

      {/* Lens handle / output line going down-right */}
      <path
        d="M30.5 36.5 L37 43"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="sc-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ea580c" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Logo({
  iconOnly = false,
  size = 32,
  showTagline = false,
  className = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />

      {!iconOnly && (
        <div className="flex flex-col">
          <span className="text-base font-bold text-gray-900 dark:text-white leading-none tracking-tight">
            Scrape<span className="text-brand-600 dark:text-brand-400">Core</span>
          </span>
          {showTagline && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium tracking-wide">
              Behavioural Market Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
}
