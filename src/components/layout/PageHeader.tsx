export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="mb-7">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold text-stone-950">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-500">{description}</p>
    </header>
  );
}
