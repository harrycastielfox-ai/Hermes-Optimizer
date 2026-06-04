import { MetricCard } from "../../components/cards/MetricCard";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { getDiagnosticReport, getHardwareInfo, runDiagnostics } from "../../lib/tauri";
import type { DiagnosticResult } from "../../lib/types";
import { formatBytesAsGb, formatUptime } from "../../lib/utils/format";

function accentFor(status: string) {
  if (status === "ok") return "green" as const;
  if (status === "critical") return "purple" as const;
  return "cyan" as const;
}

function findDiagnostic(items: DiagnosticResult[], id: string) {
  return items.find((item) => item.id === id);
}

function mhz(value: number) {
  return value > 0 ? `${value} MHz` : "Não informado";
}

function optionalCount(value: number, label: string) {
  return value > 0 ? `${value} ${label}` : "Não informado";
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

  if (loading || !diagnostics || !hardware || !report) {
    return (
      <>
        <PageHeader eyebrow="Diagnóstico inteligente" title="Diagnóstico do sistema" description="Coleta local somente leitura para identificar pontos de atenção sem aplicar correções no Windows." />
        <ApiNotice error={error} fallback={fallback} />
        <LoadingState />
      </>
    );
  }

  const primaryDisk = hardware.disks.find((disk) => disk.isPrimary) ?? hardware.disks[0];
  const gpu = hardware.gpu?.detected ? hardware.gpu : null;
  const diagnosticBlocks = [
    { title: "Sistema", item: findDiagnostic(diagnostics, "system") },
    { title: "CPU", item: findDiagnostic(diagnostics, "cpu") },
    { title: "Memória", item: findDiagnostic(diagnostics, "memory") },
    { title: "Disco", item: findDiagnostic(diagnostics, "disk") },
    { title: "GPU", item: findDiagnostic(diagnostics, "gpu") },
    { title: "Inicialização", item: findDiagnostic(diagnostics, "startup") },
  ].filter((block): block is { title: string; item: DiagnosticResult } => Boolean(block.item));

  return (
    <>
      <PageHeader eyebrow="Diagnóstico inteligente" title="Diagnóstico do sistema" description="Hardware Intelligence em modo somente leitura: o Hermes coleta dados locais e não altera Windows, Registro, serviços, drivers, energia ou arquivos." />
      <ApiNotice error={error} fallback={fallback} />
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Health score" value={`${report.health.score}/100`} description={report.health.label} accent={report.health.score >= 75 ? "green" : "purple"} />
          <MetricCard title="Performance" value={`${report.health.performanceScore}/100`} description="RAM, CPU e inicialização" />
          <MetricCard title="Storage" value={`${report.health.storageScore}/100`} description={primaryDisk ? `${primaryDisk.usagePercent}% usado em ${primaryDisk.driveLetter}` : "Disco não detectado"} />
          <MetricCard title="Gaming readiness" value={`${report.health.gamingReadinessScore}/100`} description={gpu ? gpu.name : "GPU não detectada nesta leitura."} accent={gpu ? "green" : "cyan"} />
        </div>

        <SectionCard title="Relatório Hermes" description={report.summary}>
          <div className="grid grid-cols-2 gap-5 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <h3 className="mb-3 font-semibold text-white">Scores separados</h3>
              <ul className="space-y-2">
                <li>• Performance: {report.health.performanceScore}/100</li>
                <li>• Estabilidade: {report.health.stabilityScore}/100</li>
                <li>• Armazenamento: {report.health.storageScore}/100</li>
                <li>• Prontidão gamer: {report.health.gamingReadinessScore}/100</li>
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

        <SectionCard title="Blocos de diagnóstico" description="Leitura local por backend Rust/Tauri. Os cartões explicam o achado e não executam correções.">
          <div className="grid grid-cols-3 gap-4">
            {diagnosticBlocks.map(({ item, title }) => (
              <MetricCard key={item.id} title={title} value={item.value} description={`${item.description} ${item.recommendation}`} accent={accentFor(item.status)} />
            ))}
          </div>
        </SectionCard>

        <div className="grid grid-cols-2 gap-5">
          <SectionCard title="Sistema e CPU" description="Arquitetura, núcleos físicos, threads e frequência quando CIM expõe os dados.">
            <div className="space-y-3 text-sm text-slate-300">
              <p>Sistema: <strong className="text-white">{hardware.os.name}</strong></p>
              <p>Build: <strong className="text-white">{hardware.os.version} / {hardware.os.build}</strong></p>
              <p>Uptime: <strong className="text-white">{formatUptime(hardware.os.uptimeSeconds)}</strong></p>
              <p>CPU: <strong className="text-white">{hardware.cpu.name}</strong></p>
              <p>Fabricante/arquitetura: <strong className="text-white">{hardware.cpu.manufacturer} • {hardware.cpu.architecture}</strong></p>
              <p>Núcleos/threads: <strong className="text-white">{hardware.cpu.physicalCores} físicos • {hardware.cpu.logicalProcessors} lógicos</strong></p>
              <p>Frequência: <strong className="text-white">base {mhz(hardware.cpu.baseFrequencyMhz)} • máxima {mhz(hardware.cpu.maxFrequencyMhz)}</strong></p>
            </div>
          </SectionCard>

          <SectionCard title="Memória" description="Uso atual, capacidade, pentes, slots e velocidade quando o Windows informa.">
            <div className="space-y-3 text-sm text-slate-300">
              <p>Total: <strong className="text-white">{formatBytesAsGb(hardware.memory.totalBytes)}</strong></p>
              <p>Usada: <strong className="text-white">{formatBytesAsGb(hardware.memory.usedBytes)} ({hardware.memory.usagePercent}%)</strong></p>
              <p>Disponível: <strong className="text-white">{formatBytesAsGb(hardware.memory.availableBytes || hardware.memory.freeBytes)}</strong></p>
              <p>Pentes: <strong className="text-white">{optionalCount(hardware.memory.moduleCount, "detectado(s)")}</strong></p>
              <p>Slots: <strong className="text-white">{optionalCount(hardware.memory.slotCount, "slot(s)")}</strong></p>
              <p>Velocidade: <strong className="text-white">{mhz(hardware.memory.speedMhz)}</strong></p>
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <SectionCard title="Discos" description="Modelo, mídia, letra, espaço total, livre, usado e percentual por unidade local.">
            <div className="space-y-3 text-sm text-slate-300">
              {hardware.disks.map((disk) => (
                <div key={`${disk.driveLetter}-${disk.model}`} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <p><strong className="text-white">{disk.driveLetter}</strong> • {disk.model} • {disk.mediaType}</p>
                  <p>{formatBytesAsGb(disk.usedBytes)} usados de {formatBytesAsGb(disk.totalBytes)} ({disk.usagePercent}%)</p>
                  <p>{formatBytesAsGb(disk.freeBytes)} livres {disk.isPrimary ? "• disco principal" : ""}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="GPU" description="Adaptador gráfico lido por Win32_VideoController quando disponível.">
            <div className="space-y-3 text-sm text-slate-300">
              {gpu ? (
                <>
                  <p>Nome: <strong className="text-white">{gpu.name}</strong></p>
                  <p>Fabricante: <strong className="text-white">{gpu.manufacturer}</strong></p>
                  <p>Memória dedicada: <strong className="text-white">{gpu.dedicatedMemoryBytes > 0 ? formatBytesAsGb(gpu.dedicatedMemoryBytes) : "Não informada"}</strong></p>
                  <p>Driver: <strong className="text-white">{gpu.driverVersion}</strong></p>
                  <p>Status: <strong className="text-white">{gpu.status}</strong></p>
                </>
              ) : (
                <p><strong className="text-white">GPU não detectada nesta leitura.</strong> Alguns ambientes, drivers ou permissões podem limitar a exposição via CIM/WMI.</p>
              )}
              <p>Fonte: <strong className="text-white">{hardware.dataSource}</strong></p>
              <p className="text-slate-400">{hardware.safetyNote}</p>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
