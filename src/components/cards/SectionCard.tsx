import type { PropsWithChildren } from "react";

export function SectionCard({ title, description, children }: PropsWithChildren<{ title?: string; description?: string }>) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/82 p-8 shadow-[0_24px_75px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      {(title || description) && (
        <header className="mb-7">
          {title && <h2 className="font-serif text-3xl font-semibold uppercase tracking-tight text-slate-950">{title}</h2>}
          {description && <p className="mt-2 text-lg leading-7 text-slate-600">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
