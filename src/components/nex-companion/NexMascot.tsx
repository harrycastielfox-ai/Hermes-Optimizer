import type { NexOptimizationStatus } from "@/types/nex-companion";

type NexMascotProps = {
  status: NexOptimizationStatus;
  compact?: boolean;
};

export function NexMascot({ status, compact = false }: NexMascotProps) {
  return (
    <div
      className={`nex-mascot nex-mascot--${status}${compact ? " nex-mascot--compact" : ""}`}
      role="img"
      aria-label={mascotLabel(status)}
    >
      <svg viewBox="0 0 180 220" aria-hidden="true">
        <defs>
          <linearGradient id="nex-shell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5a4b76" />
            <stop offset="0.46" stopColor="#171321" />
            <stop offset="1" stopColor="#060509" />
          </linearGradient>
          <linearGradient id="nex-face" x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#171223" />
            <stop offset="1" stopColor="#020204" />
          </linearGradient>
          <linearGradient id="nex-chest" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b75cff" />
            <stop offset="1" stopColor="#6820df" />
          </linearGradient>
          <filter id="nex-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse className="nex-mascot__shadow" cx="90" cy="203" rx="50" ry="9" />

        <g className="nex-mascot__body">
          <path
            d="M54 125c4-24 18-38 36-38s32 14 36 38l10 55c2 11-7 20-18 20H62c-11 0-20-9-18-20z"
            fill="url(#nex-shell)"
            stroke="#8f63ce"
            strokeWidth="2"
          />
          <path
            d="M68 137c5-12 13-18 22-18s17 6 22 18l4 37H64z"
            fill="#0a0810"
            stroke="#49365f"
            strokeWidth="1.5"
          />
          <path
            d="M78 139h12l19 18-9 13-10-10-10 10-9-13 13-12z"
            fill="url(#nex-chest)"
            filter="url(#nex-glow)"
          />
          <path d="M80 145v20l20-20v20" fill="none" stroke="#f4eaff" strokeWidth="3.5" />
        </g>

        <g className="nex-mascot__arms">
          <path
            d="M48 134c-18 7-24 25-15 36 5 6 12 4 15-3l13-29z"
            fill="url(#nex-shell)"
            stroke="#7855a6"
            strokeWidth="2"
          />
          <path
            d="M132 134c18 7 24 25 15 36-5 6-12 4-15-3l-13-29z"
            fill="url(#nex-shell)"
            stroke="#7855a6"
            strokeWidth="2"
          />
        </g>

        <g className="nex-mascot__head">
          <path
            d="M36 72c0-34 23-57 54-57s54 23 54 57v20c0 22-17 39-39 39H75c-22 0-39-17-39-39z"
            fill="url(#nex-shell)"
            stroke="#aa76e9"
            strokeWidth="2.2"
          />
          <path
            d="M49 70c0-23 17-39 41-39s41 16 41 39v18c0 17-13 29-29 29H78c-16 0-29-12-29-29z"
            fill="url(#nex-face)"
            stroke="#4c3764"
            strokeWidth="1.5"
          />
          <path
            className="nex-mascot__visor"
            d="M58 69c7-18 20-27 39-27 11 0 20 3 27 10-7-15-19-23-35-23-20 0-34 12-40 31z"
            fill="rgba(255,255,255,.1)"
          />
          <ellipse
            className="nex-mascot__eye nex-mascot__eye--left"
            cx="73"
            cy="78"
            rx="8"
            ry="11"
            fill="#f1d9ff"
            filter="url(#nex-glow)"
          />
          <ellipse
            className="nex-mascot__eye nex-mascot__eye--right"
            cx="107"
            cy="78"
            rx="8"
            ry="11"
            fill="#f1d9ff"
            filter="url(#nex-glow)"
          />
          <path
            className="nex-mascot__mouth"
            d="M82 99c5 5 11 5 16 0"
            fill="none"
            stroke="#b96bff"
            strokeLinecap="round"
            strokeWidth="3"
            filter="url(#nex-glow)"
          />
        </g>

        {status === "completed" && (
          <path
            className="nex-mascot__status-mark"
            d="M133 27l7 7 13-16"
            fill="none"
            stroke="#44efb0"
            strokeLinecap="round"
            strokeWidth="5"
          />
        )}
        {status === "error" && (
          <path
            className="nex-mascot__status-mark"
            d="M140 17v14m0 8v1"
            fill="none"
            stroke="#ff6b7b"
            strokeLinecap="round"
            strokeWidth="5"
          />
        )}
      </svg>
    </div>
  );
}

function mascotLabel(status: NexOptimizationStatus) {
  if (status === "completed") return "Mascote NEX comemorando";
  if (status === "error") return "Mascote NEX pedindo atenção";
  if (status === "paused") return "Mascote NEX aguardando";
  return "Mascote NEX trabalhando";
}
