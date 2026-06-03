import { RiskBadge } from "../../components/badges/RiskBadge";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { listStartupApps } from "../../lib/tauri";

export function StartupPage() {
  const { data: startupApps, loading, error, fallback } = useHermesResource(listStartupApps);

  return (
    <>
      <PageHeader eyebrow="Gerenciador de inicialização" title="Apps que iniciam com o Windows" description="Lista mockada com estrutura preparada para futura integração real com chaves e pastas de inicialização do Windows." />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !startupApps ? <LoadingState /> : (
        <SectionCard>
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-300"><tr>{["Nome", "Fabricante", "Caminho", "Impacto", "Status", "Risco", "Ação sugerida"].map((h) => <th key={h} className="p-4 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-800">
                {startupApps.map((app) => <tr key={app.id} className="bg-slate-950/50"><td className="p-4 text-white">{app.name}</td><td className="p-4 text-slate-300">{app.publisher}</td><td className="p-4 font-mono text-xs text-slate-400">{app.path}</td><td className="p-4 text-slate-300">{app.impact}</td><td className="p-4 text-slate-300">{app.enabled ? "Ativo" : "Desativado"}</td><td className="p-4"><RiskBadge risk={app.risk} /></td><td className="p-4 text-slate-400">{app.suggestedAction}</td></tr>)}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </>
  );
}
