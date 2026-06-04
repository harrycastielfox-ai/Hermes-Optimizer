import { Zap } from "lucide-react";

export function HealthRing({ value = 97, size = 72 }: { value?: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(0.92 0.02 250)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#hg)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.2 250)" />
            <stop offset="100%" stopColor="oklch(0.55 0.22 265)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
      </div>
    </div>
  );
}
