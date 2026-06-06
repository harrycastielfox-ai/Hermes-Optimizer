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

export function MetricCard({ icon: Icon, label, value, sub, footer, iconBg = "bg-primary-soft", iconColor = "text-primary", children }: Props) {
  return (
    <div className="rounded-xl bg-card border border-border/60 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_22px_-14px_rgba(15,23,42,0.10)]">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-[22px] h-[22px] ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-slate-600">{label}</p>
          <p className="text-[24px] font-bold tracking-tight mt-0.5 leading-none text-slate-950">{value}</p>
          {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
      {children && <div className="mt-2">{children}</div>}
      {footer && <p className="text-[10px] leading-snug text-muted-foreground mt-2">{footer}</p>}
    </div>
  );
}

export function ProgressBar({ value, gradient = "from-primary to-primary" }: { value: number; gradient?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function Sparkline() {
  const pts = [22, 28, 24, 32, 30, 38, 34, 42, 40, 48, 46, 52, 50, 56];
  const max = 60, w = 220, h = 36;
  const step = w / (pts.length - 1);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${i * step},${h - (p / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7">
      <defs>
        <linearGradient id="sp" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.6 0.2 250)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(0.6 0.2 250)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#sp)" />
      <path d={d} fill="none" stroke="oklch(0.55 0.22 260)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
