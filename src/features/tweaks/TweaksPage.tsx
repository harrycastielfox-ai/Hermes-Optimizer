import { useMemo } from "react";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { listAvailableTweaks } from "../../lib/tauri";
import type { HermesTweak } from "../../lib/types";

const cards = [
  { key: "safe", title: "Safe Tweaks", tone: "bg-emerald-50/70", badge: "Baixo" },
  { key: "gamer", title: "Gamer Tweaks", tone: "bg-amber-50/50", badge: "Médio" },
  { key: "extreme", title: "Extreme Tweaks", tone: "bg-rose-50/60", badge: "Alto · requer backup" },
];

function fallbackItems(mode: string) {
  if (mode === "safe") return ["Apps em segundo plano", "Limpeza de temporários", "Apps de inicialização", "Modo jogo do Windows", "Plano de energia", "Efeitos visuais leves"];
  if (mode === "gamer") return ["Fechar processos selecionados", "Suspender apps secundários", "Alto desempenho", "Priorizar processo ativo", "Reduzir overlays/launchers"];
  return ["Serviços não essenciais", "Telemetria opcional", "Indexação", "Animações", "Políticas de background", "Registro (apenas com backup)"];
}

export function TweaksPage() {
  const { data: tweaks, loading, error, fallback } = useHermesResource(listAvailableTweaks);
  const byMode = useMemo(() => (tweaks ?? []).reduce<Record<string, HermesTweak[]>>((acc, tweak) => ({ ...acc, [tweak.mode]: [...(acc[tweak.mode] ?? []), tweak] }), {}), [tweaks]);

  return (
    <>
      <PageHeader eyebrow="Sistema" title="Otimizações" description="" />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !tweaks ? <LoadingState /> : (
        <div className="grid gap-7 xl:grid-cols-3">
          {cards.map((card) => {
            const items = (byMode[card.key] ?? []).slice(0, 6).map((t) => t.name);
            const names = items.length ? items : fallbackItems(card.key);
            return (
              <article key={card.key} className={`min-h-[420px] rounded-3xl border border-slate-200 p-8 shadow-[0_24px_75px_rgba(15,23,42,0.08)] ${card.tone}`}>
                <div className="flex items-start justify-between gap-4"><h2 className="font-serif text-3xl uppercase text-slate-950">{card.title}</h2><span className="rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em]">{card.badge}</span></div>
                <ul className="mt-7 space-y-4 text-lg text-slate-950">{names.map((name) => <li key={name} className="flex gap-3"><span className="grid h-5 w-5 place-items-center rounded-full border border-amber-400 text-xs text-amber-500">✓</span>{name}</li>)}</ul>
                <button className="mt-8 w-full rounded-2xl border border-slate-200 bg-white/70 py-3 text-lg font-medium">Revisar tweaks</button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
