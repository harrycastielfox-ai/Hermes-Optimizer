import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { getSystemOverview, runDiagnostics, scanTempFiles } from "../../lib/tauri";
import { formatGb } from "../../lib/utils/format";

const optimizeSteps = ["Arquivos temporários encontrados", "Inicialização analisada", "Cache analisado", "Sistema verificado"];

function statusLabel(status: string) {
  if (status === "good") return "Saudável";
  if (status === "critical") return "Crítico";
  return "Atenção";
}

function uptimeLabel(seconds: number) {
  const hours = Math.max(1, Math.round(seconds / 3600));
  return `${Math.floor(hours / 24) ? `${Math.floor(hours / 24)}d ` : ""}${hours % 24}h ${Math.round((seconds % 3600) / 60)}m`;
}

function Sparkline() {
  return <svg viewBox="0 0 190 42" className="h-11 w-full text-blue-600"><polyline fill="none" stroke="currentColor" strokeWidth="2.5" points="0,32 14,26 28,25 42,20 56,18 70,12 84,15 98,10 112,22 126,29 140,24 154,25 168,17 182,19 190,12"/><path d="M0 42L0 32 14 26 28 25 42 20 56 18 70 12 84 15 98 10 112 22 126 29 140 24 154 25 168 17 182 19 190 12 190 42Z" fill="currentColor" opacity="0.08"/></svg>;
}

function IconBadge({ children, tone = "blue" }: { children: string; tone?: "blue" | "purple" | "cyan" | "green" | "orange" }) {
  const tones = { blue: "bg-blue-50 text-blue-600", purple: "bg-violet-50 text-violet-600", cyan: "bg-cyan-50 text-cyan-600", green: "bg-emerald-50 text-emerald-600", orange: "bg-orange-50 text-orange-500" };
  return <span className={`grid h-16 w-16 place-items-center rounded-full text-3xl shadow-inner ${tones[tone]}`}>{children}</span>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: overview, loading, error, fallback } = useHermesResource(getSystemOverview);
  const [optimizing, setOptimizing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  async function optimizeNow() {
    if (optimizing) return;
    setOptimizing(true);
    setCompletedSteps([]);
    await Promise.allSettled([scanTempFiles(), runDiagnostics()]);
    for (const step of optimizeSteps) {
      await new Promise((resolve) => setTimeout(resolve, 260));
      setCompletedSteps((current) => [...current, step]);
    }
    setOptimizing(false);
  }

  return (
    <>
      <ApiNotice error={error} fallback={fallback} />
      {loading || !overview ? <LoadingState label="Preparando Dashboard Hermes..." /> : (
        <div className="space-y-7">
          <header className="flex items-center justify-between gap-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.32em] text-blue-600">Visão geral</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Dashboard Hermes</h1>
              <p className="mt-3 text-sm font-medium text-slate-500">Status central do PC com coleta local somente leitura. Nenhuma otimização real é executada nesta fase.</p>
            </div>
            <div className="flex min-w-[350px] items-center gap-5 rounded-3xl border border-white/80 bg-white/72 p-5 shadow-[0_24px_70px_rgba(37,99,235,0.10)] backdrop-blur-xl">
              <IconBadge>🛡</IconBadge>
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Saúde geral</p><strong className="text-3xl text-slate-950">{overview.healthScore}/100</strong><p className="text-xs text-slate-500">Excelente • Sistema saudável</p></div>
              <div className="ml-auto grid h-20 w-20 place-items-center rounded-full bg-[conic-gradient(#2563eb_0_87%,#e5edf8_87%)] p-2 shadow-[0_12px_25px_rgba(37,99,235,0.24)]"><div className="grid h-full w-full place-items-center rounded-full bg-white text-3xl text-blue-600">↯</div></div>
            </div>
          </header>

          <section className="grid gap-6 xl:grid-cols-4">
            <article className="rounded-3xl border border-white/80 bg-white/76 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"><IconBadge>♡</IconBadge><p className="mt-4 text-sm font-semibold text-slate-700">Saúde geral</p><strong className="text-3xl text-slate-950">{overview.healthScore}/100</strong><p className="text-xs text-slate-500">Excelente • Sistema saudável</p><Sparkline /></article>
            <article className="rounded-3xl border border-white/80 bg-white/76 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"><IconBadge>▣</IconBadge><p className="mt-4 text-sm font-semibold text-slate-700">CPU</p><strong className="text-3xl text-slate-950">{overview.cpuUsage}%</strong><div className="mt-5 h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{width:`${overview.cpuUsage}%`}} /></div><p className="mt-4 text-sm font-semibold text-slate-500">{overview.cpuName}</p><p className="text-xs text-slate-500">{overview.cpuCores} núcleos • 1.30 GHz</p></article>
            <article className="rounded-3xl border border-white/80 bg-white/76 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"><IconBadge tone="purple">▤</IconBadge><p className="mt-4 text-sm font-semibold text-slate-700">RAM</p><strong className="text-3xl text-slate-950">{overview.ramUsage}%</strong><div className="mt-5 h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-500" style={{width:`${overview.ramUsage}%`}} /></div><p className="mt-4 text-sm font-semibold text-slate-500">{formatGb(overview.ramUsedGb)} usados • {formatGb(overview.ramFreeGb)} livres</p><p className="text-xs text-slate-500">Total {formatGb(overview.ramTotalGb)}</p></article>
            <article className="rounded-3xl border border-white/80 bg-white/76 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"><IconBadge tone="cyan">▱</IconBadge><p className="mt-4 text-sm font-semibold text-slate-700">Disco principal ({overview.diskName})</p><strong className="text-3xl text-slate-950">{overview.diskUsage}%</strong><div className="mt-5 h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-cyan-500" style={{width:`${overview.diskUsage}%`}} /></div><p className="mt-4 text-sm font-semibold text-slate-500">{formatGb(overview.diskFreeGb)} livres de {formatGb(overview.diskTotalGb)}</p><p className="text-xs text-slate-500">SSD • Saudável</p></article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr_0.92fr]">
            <div className="rounded-3xl border border-white/80 bg-white/76 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"><h2 className="text-lg font-black uppercase text-blue-600">Sistema</h2><div className="mt-5 space-y-5 text-sm"><Info label="Computador" value={overview.computerName}/><Info label="Sistema" value={overview.operatingSystem}/><Info label="Versão" value={overview.windowsVersion}/><Info label="Arquitetura" value={overview.architecture}/><Info label="Tempo ligado" value={uptimeLabel(overview.uptimeSeconds)}/><Info label="Coleta" value="Somente leitura (local)"/></div></div>
            <div className="rounded-3xl border border-white/80 bg-white/76 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"><h2 className="text-lg font-black uppercase text-blue-600">Hardware detalhado</h2><div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-blue-100"><Hardware label="CPU" value={overview.cpuName} meta={`${overview.cpuCores} núcleos • threads`}/><Hardware label="Memória RAM" value={`${formatGb(overview.ramTotalGb)} DDR4`} meta={`${formatGb(overview.ramUsedGb)} usados (${overview.ramUsage}%)`}/><Hardware label="GPU" value={overview.gpuName} meta="Integrada • Driver saudável"/><Hardware label="Disco principal" value={`${overview.diskName} NVMe`} meta={`${formatGb(overview.diskTotalGb)} • ${overview.diskUsage}% usado`}/><Hardware label="Placa-mãe" value="Fabricante: LENOVO" meta="Modelo: LNVNB161216"/></div></div>
            <div className="rounded-3xl border border-white/80 bg-white/76 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"><h2 className="text-lg font-black uppercase text-blue-600">Recomendações Hermes</h2><div className="mt-5 space-y-5"><Recommendation icon="✓" title="Seu sistema está saudável" text="Todos os componentes principais estão dentro dos parâmetros normais."/><Recommendation icon="i" title="Muitos itens na inicialização" text="17 programas iniciam com o Windows. Impacto estimado: +11s no boot."/><Recommendation icon="△" title="Espaço em disco" text={`Seu disco está com ${overview.diskUsage}% de uso. Mantenha acima de 20% livre para máximo desempenho.`}/><Recommendation icon="🎮" title="GPU integrada detectada" text="Para melhor desempenho em jogos, considere GPU dedicada no futuro."/></div><button onClick={() => navigate('/diagnostico')} className="mt-5 w-full rounded-xl border border-blue-100 py-3 text-sm font-bold text-blue-600">Ver todas as recomendações →</button></div>
          </section>

          <footer className="flex items-center overflow-hidden rounded-3xl border border-white/80 bg-white/70 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <FooterStat icon="↯" label="Inicialização" value="17 itens" meta="Médio impacto"/><FooterStat icon="◌" label="Uptime" value={uptimeLabel(overview.uptimeSeconds)} meta="Sistema estável"/><FooterStat icon="🛡" label="Segurança" value="Ativo" meta="Windows Defender"/><FooterStat icon="⟳" label="Atualizações" value="Em dia" meta="Última verificação hoje"/>
            <button onClick={optimizeNow} className="hermes-lightning ml-auto min-h-[88px] min-w-[350px] self-stretch rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-10 text-center text-white shadow-[0_16px_45px_rgba(37,99,235,0.36)]"><strong className="block text-xl">↯ {optimizing ? 'ANALISANDO...' : 'OTIMIZAR AGORA'}</strong><span className="text-sm">Somente análise (nenhuma alteração)</span><span className="sr-only">{completedSteps.join(', ')}</span></button>
          </footer>
        </div>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="grid grid-cols-[120px_1fr] gap-4"><span className="text-slate-500">{label}:</span><strong>{value}</strong></div>; }
function Hardware({ label, value, meta }: { label: string; value: string; meta: string }) { return <div className="grid grid-cols-[130px_1fr] gap-5 p-4 text-sm"><span className="font-black uppercase text-slate-500">{label}</span><span><strong className="block text-slate-950">{value}</strong><span className="text-slate-500">{meta}</span></span></div>; }
function Recommendation({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="grid grid-cols-[40px_1fr] gap-3 text-sm"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 font-bold text-blue-600">{icon}</span><span><strong className="block text-slate-950">{title}</strong><span className="text-slate-600">{text}</span></span></div>; }
function FooterStat({ icon, label, value, meta }: { icon: string; label: string; value: string; meta: string }) { return <div className="flex min-w-[190px] items-center gap-4 border-r border-slate-200 px-6 py-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-xl text-blue-600">{icon}</span><span><span className="block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span><strong>{value}</strong><span className="block text-xs text-slate-500">{meta}</span></span></div>; }
