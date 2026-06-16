import { Zap } from "lucide-react";

export function HealthRing({
  value = 97,
  size = 72,
  stroke = 7,
}: {
  value?: number;
  size?: number;
  stroke?: number;
}) {
  const safeValue = Math.min(100, Math.max(0, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (safeValue / 100) * c;
  const gradientId = `hermes-health-${size}-${stroke}`;

  return (
    <div
      className="relative drop-shadow-[0_14px_24px_rgba(37,99,235,0.18)]"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="oklch(0.92 0.02 250)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - stroke / 1.8}
          stroke="oklch(0.97 0.01 250)"
          strokeWidth="1"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.2 250)" />
            <stop offset="100%" stopColor="oklch(0.55 0.22 265)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-[56%] w-[56%] items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/35 ring-4 ring-white/80">
          <Zap className="h-[48%] w-[48%] text-white fill-white" />
        </div>
      </div>
    </div>
  );
}
