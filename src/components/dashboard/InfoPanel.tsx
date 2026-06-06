import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

type PanelIcon = ComponentType<{ className?: string }> | string;

function PanelIconView({ icon, className }: { icon: PanelIcon; className?: string }) {
  if (typeof icon === "string") {
    return <img src={icon} alt="" aria-hidden="true" className={className ?? "w-5 h-5 object-contain"} />;
  }

  const Icon = icon;
  return <Icon className={className ?? "w-3.5 h-3.5 text-muted-foreground"} />;
}

export function InfoPanel({ title, children, watermarkSrc }: { title: string; children: ReactNode; watermarkSrc?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border/60 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      {watermarkSrc && (
        <img
          src={watermarkSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -bottom-2 w-[220px] max-w-[66%] opacity-[0.11] grayscale contrast-125 mix-blend-multiply"
        />
      )}
      <h3 className="relative z-10 text-[12px] font-bold tracking-wider text-primary mb-3">{title}</h3>
      <div className="relative z-10 space-y-4">{children}</div>
    </div>
  );
}

export function InfoRow({ icon, label, value }: { icon: PanelIcon; label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[38px_122px_minmax(0,1fr)] items-center gap-3">
      <div className="w-9 h-9 flex items-center justify-center shrink-0">
        <PanelIconView icon={icon} className={typeof icon === "string" ? "w-8 h-8 object-contain" : "w-8 h-8 text-blue-600 drop-shadow-[0_4px_8px_rgba(37,99,235,0.18)]"} />
      </div>
      <span className="text-[12px] leading-none text-muted-foreground">{label}</span>
      <span className="min-w-0 text-[13px] leading-snug text-foreground/90">{value}</span>
    </div>
  );
}

export function HwRow({ icon, label, primary, secondary }: { icon: PanelIcon; label: string; primary: string; secondary?: string }) {
  return (
    <div className="grid grid-cols-[38px_142px_minmax(0,1fr)] items-center gap-3">
      <div className="w-9 h-9 flex items-center justify-center shrink-0">
        <PanelIconView icon={icon} className={typeof icon === "string" ? "w-8 h-8 object-contain" : "w-8 h-8 text-blue-600 drop-shadow-[0_4px_8px_rgba(37,99,235,0.18)]"} />
      </div>
      <span className="text-[11px] font-semibold leading-none tracking-wider text-muted-foreground">{label}</span>
      <div className="min-w-0 text-[13px] leading-snug">
        <div className="text-foreground/90">{primary}</div>
        {secondary && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{secondary}</div>}
      </div>
    </div>
  );
}

export function RecRow({ icon: Icon, color, title, desc }: { icon: LucideIcon; color: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
      </div>
    </div>
  );
}
