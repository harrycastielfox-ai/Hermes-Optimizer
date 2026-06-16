import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  footer?: ReactNode;
  iconBg?: string;
  iconColor?: string;
  children?: ReactNode;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  footer,
  iconBg = "bg-primary-soft",
  iconColor = "text-primary",
  children,
}: Props) {
  return (
    <div className="group relative min-h-[132px] overflow-hidden rounded-2xl border border-border/60 bg-card/95 px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_34px_-24px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_18px_40px_-28px_rgba(37,99,235,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-primary/5 opacity-80 dark:from-white/8 dark:via-transparent dark:to-primary/10 dark:opacity-45" />
      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBg} shadow-[0_10px_24px_-20px_rgba(37,99,235,0.65)]`}
        >
          <Icon className={`h-[23px] w-[23px] ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold leading-none text-muted-foreground">{label}</p>
          <p className="mt-1 text-[23px] font-semibold leading-none tracking-normal text-foreground">
            {value}
          </p>
          {sub && <p className="mt-1 line-clamp-1 text-[9px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {children && <div className="relative mt-3">{children}</div>}
      {footer && (
        <p className="relative mt-2 text-[10px] leading-snug text-muted-foreground">{footer}</p>
      )}
    </div>
  );
}

export function ProgressBar({
  value,
  gradient = "from-primary to-primary",
}: {
  value: number;
  gradient?: string;
}) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export function Sparkline() {
  const pts = [22, 28, 24, 32, 30, 38, 34, 42, 40, 48, 46, 52, 50, 56];
  const max = 60,
    w = 220,
    h = 36;
  const step = w / (pts.length - 1);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${i * step},${h - (p / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sp" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.6 0.2 250)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(0.6 0.2 250)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#sp)" />
      <path
        d={d}
        fill="none"
        stroke="oklch(0.55 0.22 260)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
