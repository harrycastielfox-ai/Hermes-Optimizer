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
    <div className="relative min-h-[348px] overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_38px_-28px_rgba(15,23,42,0.22)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/85 via-transparent to-primary/4 dark:from-white/7 dark:via-transparent dark:to-primary/10 dark:opacity-55" />
      {watermarkSrc && (
        <img
          src={watermarkSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 -bottom-3 w-[238px] max-w-[68%] opacity-[0.12] grayscale contrast-125 mix-blend-multiply [mask-image:radial-gradient(ellipse_at_center,black_42%,transparent_76%)] dark:opacity-[0.10] dark:mix-blend-multiply dark:brightness-125 dark:contrast-150"
        />
      )}
      <h3 className="relative z-10 mb-4 text-[12px] font-bold tracking-[0.18em] text-primary">{title}</h3>
      <div className="relative z-10 space-y-3.5">{children}</div>
    </div>
  );
}

export function InfoRow({ icon, label, value }: { icon: PanelIcon; label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[38px_minmax(96px,0.45fr)_minmax(0,1fr)] items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        <PanelIconView
          icon={icon}
          className={typeof icon === "string" ? "h-8 w-8 object-contain" : "h-8 w-8 text-blue-600 drop-shadow-[0_4px_8px_rgba(37,99,235,0.18)]"}
        />
      </div>
      <span className="text-[12px] leading-none text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-[13px] leading-snug text-foreground/90">{value}</span>
    </div>
  );
}

export function HwRow({ icon, label, primary, secondary }: { icon: PanelIcon; label: string; primary: string; secondary?: string }) {
  return (
    <div className="grid grid-cols-[38px_minmax(118px,0.46fr)_minmax(0,1fr)] items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        <PanelIconView
          icon={icon}
          className={typeof icon === "string" ? "h-8 w-8 object-contain" : "h-8 w-8 text-blue-600 drop-shadow-[0_4px_8px_rgba(37,99,235,0.18)]"}
        />
      </div>
      <span className="text-[11px] font-semibold leading-none tracking-wider text-muted-foreground">{label}</span>
      <div className="min-w-0 text-[13px] leading-snug">
        <div className="break-words text-foreground/90">{primary}</div>
        {secondary && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{secondary}</div>}
      </div>
    </div>
  );
}

export function RecRow({ icon: Icon, color, title, desc }: { icon: LucideIcon; color: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
      </div>
    </div>
  );
}
