import type { PropsWithChildren } from "react";

export function SectionCard({ title, description, children }: PropsWithChildren<{ title?: string; description?: string }>) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5 shadow-glow">
      {(title || description) && (
        <header className="mb-5">
          {title && <h2 className="text-lg font-semibold text-slate-50">{title}</h2>}
          {description && <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
