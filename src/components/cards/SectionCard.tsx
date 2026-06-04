import type { PropsWithChildren } from "react";

export function SectionCard({ title, description, children }: PropsWithChildren<{ title?: string; description?: string }>) {
  return (
    <section className="rounded-[1.75rem] border border-white/80 bg-white/78 p-5 shadow-premium backdrop-blur">
      {(title || description) && (
        <header className="mb-5">
          {title && <h2 className="text-lg font-semibold text-stone-950">{title}</h2>}
          {description && <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
