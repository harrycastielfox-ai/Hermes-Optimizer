import { MetricCard } from "../../components/cards/MetricCard";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { SAFETY_RULES } from "../../lib/constants/safety";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { getSystemOverview } from "../../lib/tauri";
import { formatGb, formatUptime } from "../../lib/utils/format";

function statusLabel(status: string) {
  if (status === "good") return "Saudável";
  if (status === "critical") return "Crítico";
  return "Atenção";
}

export function DashboardPage() {
  const { data: overview, loading, error, fallback } = useHermesResource(getSystemOverview);

  return (
    <>
      <PageHeader eyebrow="Visão geral" title="Dashboard Hermes" description="Status central do PC com coleta local somente leitura. Nenhuma otimização real é executada nesta fase." />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !overview ? <LoadingState /> : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <MetricCard title="Saúde geral" value={`${overview.healthScore}/100`} description={`${overview.healthLabel} • ${statusLabel(overview.status)}`} accent={overview.status === "good" ? "green" : "purple"} />
            <MetricCard title="CPU" value={`${overview.cpuUsage}%`} description={`${overview.cpuName} • ${overview.cpuCores} núcleos`} />
            <MetricCard title="RAM" value={`${overview.ramUsage}%`} description={`${formatGb(overview.ramUsedGb)} usados • ${formatGb(overview.ramFreeGb)} livres`} accent="purple" />
            <MetricCard title="Disco principal" value={`${overview.diskUsage}%`} description={`${formatGb(overview.diskFreeGb)} livres em ${overview.diskName}`} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-5">
            <SectionCard title="Sistema real" description="Dados lidos localmente pelo backend Rust/Tauri quando executado no Windows.">
              <div className="space-y-3 text-sm text-slate-300">
                <p>Computador: <strong className="text-white">{overview.computerName}</strong></p>
                <p>Sistema: <strong className="text-white">{overview.operatingSystem}</strong></p>
                <p>Versão: <strong className="text-white">{overview.windowsVersion}</strong></p>
                <p>Arquitetura: <strong className="text-white">{overview.architecture}</strong></p>
                <p>Tempo ligado: <strong className="text-white">{formatUptime(overview.uptimeSeconds)}</strong></p>
              </div>
            </SectionCard>
            <SectionCard title="Memória e disco" description="Resumo técnico para diagnóstico, sem limpeza automática.">
              <div className="space-y-3 text-sm text-slate-300">
                <p>RAM total: <strong className="text-white">{formatGb(overview.ramTotalGb)}</strong></p>
                <p>RAM usada: <strong className="text-white">{formatGb(overview.ramUsedGb)}</strong></p>
                <p>RAM livre: <strong className="text-white">{formatGb(overview.ramFreeGb)}</strong></p>
                <p>Disco total: <strong className="text-white">{formatGb(overview.diskTotalGb)}</strong></p>
                <p>Disco usado: <strong className="text-white">{formatGb(overview.diskUsedGb)}</strong></p>
              </div>
            </SectionCard>
            <SectionCard title="Camada de segurança" description="Princípios internos que governam todas as ações presentes e futuras.">
              <ul className="space-y-3 text-sm leading-6 text-slate-300">
                {SAFETY_RULES.slice(0, 5).map((rule) => <li key={rule}>• {rule}</li>)}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
