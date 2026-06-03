import { useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { MetricCard } from "../../components/cards/MetricCard";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { SAFETY_RULES } from "../../lib/constants/safety";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { getSystemOverview } from "../../lib/tauri";
import { formatMb } from "../../lib/utils/format";

export function DashboardPage() {
  const [modal, setModal] = useState<"scan" | "safe" | null>(null);
  const { data: overview, loading, error, fallback } = useHermesResource(getSystemOverview);

  return (
    <>
      <PageHeader eyebrow="Visão geral" title="Dashboard Hermes" description="Status central do PC com dados simulados e ações seguras. Nenhuma otimização real é executada nesta base inicial." />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !overview ? <LoadingState /> : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <MetricCard title="Status geral" value={overview.status === "good" ? "Saudável" : "Atenção"} description="Sem alertas críticos simulados." accent="green" />
            <MetricCard title="CPU" value={`${overview.cpuUsage}%`} description="Uso estimado atual." />
            <MetricCard title="RAM" value={`${overview.ramUsage}%`} description="Monitoramento preparado para Tauri." accent="purple" />
            <MetricCard title="Disco" value={`${overview.diskUsage}%`} description={`${overview.freeSpaceGb} GB livres.`} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-5">
            <SectionCard title="Resumo de otimização" description="Indicadores transparentes, sem linguagem alarmista.">
              <div className="space-y-4 text-sm text-slate-300">
                <p>Arquivos temporários estimados: <strong className="text-white">{formatMb(overview.tempFilesEstimateMb)}</strong></p>
                <p>Modo desempenho: <strong className="text-white">{overview.performanceMode}</strong></p>
                <p>Último diagnóstico: <strong className="text-white">{overview.lastDiagnostic}</strong></p>
              </div>
              <div className="mt-6 flex gap-3">
                <PrimaryButton onClick={() => setModal("scan")}>Analisar agora</PrimaryButton>
                <PrimaryButton variant="secondary" onClick={() => setModal("safe")}>Otimização segura</PrimaryButton>
              </div>
            </SectionCard>
            <SectionCard title="Central de segurança" description="Princípios internos que governam todas as ações presentes e futuras.">
              <ul className="space-y-3 text-sm leading-6 text-slate-300">
                {SAFETY_RULES.slice(0, 5).map((rule) => <li key={rule}>• {rule}</li>)}
              </ul>
            </SectionCard>
            <SectionCard title="Futuro: IA Hermes" description="Espaço reservado para recomendações inteligentes futuras, sem coleta de dados pessoais nesta etapa.">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4 text-sm leading-6 text-violet-100">
                A IA Hermes será adicionada apenas após políticas de privacidade, consentimento e controles locais claros.
              </div>
            </SectionCard>
          </div>
        </>
      )}
      <ConfirmModal open={modal !== null} title={modal === "scan" ? "Executar diagnóstico simulado?" : "Preparar otimização segura simulada?"} description="A ação será registrada visualmente como simulação. O frontend não executa comandos destrutivos e qualquer ação real futura passará pelo backend Rust/Tauri." onCancel={() => setModal(null)} onConfirm={() => setModal(null)} />
    </>
  );
}
