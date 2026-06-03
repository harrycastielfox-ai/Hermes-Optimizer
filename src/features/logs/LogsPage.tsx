import { RiskBadge } from "../../components/badges/RiskBadge";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { listLogs } from "../../lib/tauri";

export function LogsPage() {
  const { data: logs, loading, error, fallback } = useHermesResource(listLogs);

  return (
    <>
      <PageHeader eyebrow="Transparência" title="Logs de otimização" description="Registro claro de data, ação, módulo, resultado, risco e detalhes." />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !logs ? <LoadingState /> : (
        <SectionCard>
          <div className="space-y-3">
            {logs.map((log) => <article key={log.id} className="grid grid-cols-[180px_1fr_140px_110px_110px] items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-4 text-sm"><span className="text-slate-400">{log.date}</span><span className="text-white">{log.action}<small className="mt-1 block text-slate-500">{log.details}</small></span><span className="text-slate-300">{log.module}</span><span className="text-cyan-100">{log.result}</span><RiskBadge risk={log.risk} /></article>)}
          </div>
        </SectionCard>
      )}
    </>
  );
}
