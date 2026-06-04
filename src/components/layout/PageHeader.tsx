export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="mb-9">
      <p className="font-mono text-sm font-semibold uppercase tracking-[0.55em] text-amber-500">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-5xl font-black uppercase tracking-tight text-slate-950">{title}</h1>
      <p className="mt-5 max-w-4xl text-lg leading-7 text-slate-600">{description}</p>
    </header>
  );
}
