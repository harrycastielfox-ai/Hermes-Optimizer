import { MetricCard } from "../../components/cards/MetricCard";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { getDiagnosticReport, getHardwareInfo, runDiagnostics } from "../../lib/tauri";
import { formatBytesAsGb, formatUptime } from "../../lib/utils/format";

function accentFor(status: string) {
  if (status === "ok") return "green" as const;
  if (status === "critical") return "purple" as const;
  return "cyan" as const;
}

export function DiagnosticsPage() {
  const diagnosticsState = useHermesResource(runDiagnostics);
  const hardwareState = useHermesResource(getHardwareInfo);
  const reportState = useHermesResource(getDiagnosticReport);
  const loading = diagnosticsState.loading || hardwareState.loading || reportState.loading;
  const fallback = diagnosticsState.fallback || hardwareState.fallback || reportState.fallback;
  const error = diagnosticsState.error ?? hardwareState.error ?? reportState.error;
  const diagnostics = diagnosticsState.data;
  const hardware = hardwareState.data;
  const report = reportState.data;

  return (
    <>
      <PageHeader eyebrow="Diagnóstico inteligente" title="Diagnóstico do sistema" description="Coleta local somente leitura para identificar pontos de atenção sem aplicar correções no Windows." />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !diagnostics || !hardware || !report ? <LoadingState /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <MetricCard title="Health score" value={`${report.health.score}/100`} description={report.health.label} accent={report.health.score >= 75 ? "green" : "purple"} />
            <MetricCard title="CPU" value={hardware.cpu.frequencyMhz ? `${hardware.cpu.frequencyMhz} MHz` : "Detectada"} description={`${hardware.cpu.cores} núcleos • ${hardware.cpu.threads} threads`} />
            <MetricCard title="RAM disponível" value={formatBytesAsGb(hardware.memory.freeBytes)} description={`${hardware.memory.usagePercent}% em uso`} accent="purple" />
            <MetricCard title="Uptime" value={formatUptime(hardware.os.uptimeSeconds)} description="Tempo desde o último boot" />
          </div>

          <SectionCard title="Relatório Hermes" description={report.summary}>
            <div className="grid grid-cols-2 gap-5 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <h3 className="mb-3 font-semibold text-white">Por que essa nota?</h3>
                <ul className="space-y-2">
                  {report.health.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <h3 className="mb-3 font-semibold text-white">Recomendações</h3>
                <ul className="space-y-2">
                  {report.recommendations.map((recommendation) => <li key={recommendation}>• {recommendation}</li>)}
                </ul>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Diagnósticos reais" description="Todos os itens abaixo são detectados em modo leitura; nenhum botão aplica correções nesta fase.">
            <div className="grid grid-cols-3 gap-4">
              {diagnostics.map((item) => (
                <MetricCard key={item.id} title={item.title} value={item.value} description={`${item.description} ${item.recommendation}`} accent={accentFor(item.status)} />
              ))}
            </div>
          </SectionCard>

          <div className="grid grid-cols-2 gap-5">
            <SectionCard title="Hardware" description="Estrutura preparada para leitura futura de GPU.">
              <div className="space-y-3 text-sm text-slate-300">
                <p>CPU: <strong className="text-white">{hardware.cpu.name}</strong></p>
                <p>RAM total: <strong className="text-white">{formatBytesAsGb(hardware.memory.totalBytes)}</strong></p>
                <p>RAM disponível: <strong className="text-white">{formatBytesAsGb(hardware.memory.freeBytes)}</strong></p>
                <p>GPU: <strong className="text-white">{hardware.gpuReady ? "Estrutura pronta para futura coleta" : "Não preparada"}</strong></p>
                <p>Fonte: <strong className="text-white">{hardware.dataSource}</strong></p>
              </div>
            </SectionCard>
            <SectionCard title="Sistema e discos" description="Modelo do disco é exibido quando o Windows consegue informar via CIM.">
              <div className="space-y-3 text-sm text-slate-300">
                <p>Sistema: <strong className="text-white">{hardware.os.name}</strong></p>
                <p>Versão/build: <strong className="text-white">{hardware.os.version} / {hardware.os.build}</strong></p>
                {hardware.disks.map((disk) => (
                  <p key={`${disk.name}-${disk.model}`}>{disk.name} • {disk.model}: <strong className="text-white">{formatBytesAsGb(disk.freeBytes)} livres de {formatBytesAsGb(disk.totalBytes)}</strong></p>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </>
  );
}
