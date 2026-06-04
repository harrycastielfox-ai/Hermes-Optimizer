type Props = {
  title: string;
  value: string;
  description?: string;
  accent?: "cyan" | "green" | "purple" | "gold" | "stone";
};

const accentStyles = {
  cyan: "from-cyan-400/30 to-transparent text-cyan-700",
  green: "from-emerald-400/30 to-transparent text-emerald-700",
  purple: "from-violet-400/30 to-transparent text-violet-700",
  gold: "from-amber-300/80 to-transparent text-amber-700",
  stone: "from-stone-300/90 to-transparent text-stone-600",
};

export function MetricCard({ title, value, description, accent = "gold" }: Props) {
  return (
    <article className="rounded-[1.75rem] border border-white/80 bg-white/78 p-5 shadow-premium backdrop-blur">
      <div className={`mb-4 h-1.5 rounded-full bg-gradient-to-r ${accentStyles[accent]}`} />
      <p className="text-sm font-medium text-stone-500">{title}</p>
      <strong className="mt-2 block text-2xl text-stone-950">{value}</strong>
      {description && <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p>}
    </article>
  );
}
