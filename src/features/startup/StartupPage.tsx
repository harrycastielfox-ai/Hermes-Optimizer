import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { listStartupApps } from "../../lib/tauri";

function impactLabel(impact: string) { return impact === "high" ? "Alto" : impact === "medium" ? "Médio" : "Baixo"; }

export function StartupPage() {
  const { data: startupApps, loading, error, fallback } = useHermesResource(listStartupApps);

  return (
    <>
      <PageHeader eyebrow="Boot" title="Inicialização" description="" />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !startupApps ? <LoadingState /> : (
        <section className="rounded-3xl border border-slate-200 bg-white/86 p-8 shadow-[0_24px_75px_rgba(15,23,42,0.08)]">
          <h2 className="font-serif text-3xl uppercase text-slate-950">Programas de inicialização</h2>
          <p className="mt-1 text-lg text-slate-600">Apenas desabilitamos — nada é removido. Confirmação obrigatória.</p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500"><tr>{["Nome", "Caminho", "Impacto", "Status"].map((h) => <th key={h} className="px-4 py-4 font-black">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-200">
                {startupApps.slice(0, 5).map((app) => (
                  <tr key={app.id} className="bg-white/60">
                    <td className="px-4 py-4 text-lg font-semibold text-slate-950">{app.name}</td>
                    <td className="px-4 py-4 text-slate-600">{app.path}</td>
                    <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 ${app.impact === 'high' ? 'bg-amber-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{impactLabel(app.impact)}</span></td>
                    <td className="px-4 py-4 text-right"><span className={`rounded-full px-5 py-2 font-semibold ${app.enabled ? 'bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950' : 'border border-slate-200 bg-white text-slate-700'}`}>{app.enabled ? 'Ativo' : 'Desativado'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
