import { MetricCard } from "../../components/cards/MetricCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { runDiagnostics } from "../../lib/tauri";

export function DiagnosticsPage() {
  const { data: diagnostics, loading, error, fallback } = useHermesResource(runDiagnostics);

  return (
    <>
      <PageHeader eyebrow="Diagnóstico inteligente" title="Diagnóstico do sistema" description="Cards preparados para receber dados reais do backend Tauri sem executar alterações no Windows." />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !diagnostics ? <LoadingState /> : (
        <div className="grid grid-cols-4 gap-4">
          {diagnostics.map((item) => (
            <MetricCard key={item.id} title={item.title} value={item.value} description={item.description} accent={item.status === "ok" ? "green" : item.status === "warning" ? "purple" : "cyan"} />
          ))}
        </div>
      )}
    </>
  );
}
