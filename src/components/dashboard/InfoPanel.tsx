import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <h3 className="text-[13px] font-bold tracking-wider text-primary mb-4">{title}</h3>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}

export function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 flex items-baseline gap-3">
        <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
        <span className="text-sm text-foreground/90">{value}</span>
      </div>
    </div>
  );
}

export function HwRow({ icon: Icon, label, primary, secondary }: { icon: LucideIcon; label: string; primary: string; secondary?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 flex gap-3">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground w-28 shrink-0 pt-0.5">{label}</span>
        <div className="text-sm">
          <div className="text-foreground/90">{primary}</div>
          {secondary && <div className="text-xs text-muted-foreground">{secondary}</div>}
        </div>
      </div>
    </div>
  );
}

export function RecRow({ icon: Icon, color, title, desc }: { icon: LucideIcon; color: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
      </div>
    </div>
  );
}
