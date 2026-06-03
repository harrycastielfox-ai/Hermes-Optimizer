type Props = {
  title: string;
  value: string;
  description?: string;
  accent?: "cyan" | "green" | "purple";
};

const accentStyles = {
  cyan: "from-cyan-400/20 to-transparent text-cyan-200",
  green: "from-emerald-400/20 to-transparent text-emerald-200",
  purple: "from-violet-400/20 to-transparent text-violet-200",
};

export function MetricCard({ title, value, description, accent = "cyan" }: Props) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-glow">
      <div className={`mb-4 h-1.5 rounded-full bg-gradient-to-r ${accentStyles[accent]}`} />
      <p className="text-sm text-slate-400">{title}</p>
      <strong className="mt-2 block text-2xl text-slate-50">{value}</strong>
      {description && <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>}
    </article>
  );
}
