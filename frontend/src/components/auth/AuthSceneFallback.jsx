/**
 * High-craft static SVG architectural security illustration.
 * Serves as:
 * 1. Immediate placeholder while the lazy Three.js canvas loads
 * 2. Fallback when WebGL is unavailable, initialization fails, or reduced motion is preferred
 * 3. Compact emblem on narrow mobile screens
 */
export default function AuthSceneFallback({ variant = 'desktop', reason = 'static' }) {
  if (variant === 'compact') {
    return (
      <div className="auth-compact-shield" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
          <circle cx="24" cy="24" r="21" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
          <path
            d="M24 6L38 11.5V22.5C38 31.2 31.9 38.4 24 41.5C16.1 38.4 10 31.2 10 22.5V11.5L24 6Z"
            fill="#E0E7FF"
            stroke="#4338CA"
            strokeWidth="1.6"
          />
          <path
            d="M24 10L34 14V22.5C34 29 29.6 34.4 24 37C18.4 34.4 14 29 14 22.5V14L24 10Z"
            fill="#4338CA"
          />
          <path
            d="M19.2 23.8L22.5 27.1L29.2 20.2"
            stroke="#FFFFFF"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="auth-scene-fallback"
      data-testid="auth-scene-fallback"
      data-fallback-reason={reason}
      aria-hidden="true"
    >
      <svg
        className="auth-fallback-svg"
        viewBox="0 0 420 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="authShieldHalo" cx="50%" cy="48%" r="48%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.16" />
            <stop offset="65%" stopColor="#E0E7FF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="authShieldOuter" x1="140" y1="68" x2="280" y2="262" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0E7FF" />
          </linearGradient>
          <linearGradient id="authShieldCore" x1="162" y1="88" x2="258" y2="246" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>
        </defs>

        {/* Soft calibrated studio halo & shadow */}
        <circle cx="210" cy="164" r="142" fill="url(#authShieldHalo)" />
        <ellipse cx="210" cy="292" rx="78" ry="12" fill="#4338CA" fillOpacity="0.10" />

        {/* Inclined architectural orbital rings */}
        <g transform="rotate(-14 210 164)">
          <ellipse
            cx="210"
            cy="164"
            rx="156"
            ry="54"
            stroke="#6366F1"
            strokeOpacity="0.45"
            strokeWidth="1.25"
          />
          <circle cx="58" cy="152" r="5" fill="#4338CA" />
          <circle cx="362" cy="176" r="5" fill="#6366F1" />
        </g>

        <g transform="rotate(18 210 164)">
          <ellipse
            cx="210"
            cy="164"
            rx="142"
            ry="48"
            stroke="#94A3B8"
            strokeOpacity="0.55"
            strokeWidth="1.1"
            strokeDasharray="4 4"
          />
          <circle cx="90" cy="132" r="4.5" fill="#4338CA" />
          <circle cx="330" cy="196" r="4.5" fill="#15803D" />
        </g>

        {/* Precision concentric calibration circle */}
        <circle cx="210" cy="164" r="98" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 5" />

        {/* Central physical shield chassis */}
        <path
          d="M210 66L284 93C286 94 287 96 287 98V163C287 216 253 255 210 272C167 255 133 216 133 163V98C133 96 134 94 136 93L210 66Z"
          fill="url(#authShieldOuter)"
          stroke="#CBD5E1"
          strokeWidth="2"
        />

        {/* Chamfered indigo frame */}
        <path
          d="M210 79L272 102V162C272 207 243 241 210 256C177 241 148 207 148 162V102L210 79Z"
          fill="url(#authShieldCore)"
          stroke="#6366F1"
          strokeWidth="1.5"
        />

        {/* Dimensional inner bevel highlight */}
        <path
          d="M210 88L262 108V161C262 199 237 229 210 242"
          stroke="#818CF8"
          strokeOpacity="0.45"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Precision checkmark emblem */}
        <path
          d="M182 164L202 184L241 142"
          stroke="#FFFFFF"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
