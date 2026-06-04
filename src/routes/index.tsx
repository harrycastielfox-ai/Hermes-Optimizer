import { createFileRoute } from "@tanstack/react-router";
import { Heart, Cpu, MemoryStick, HardDrive, Monitor, Cog, Disc, Clock, Download, Zap, Shield, RefreshCw, CheckCircle2, Info, AlertTriangle, Gamepad2, Minus, Square, X, CircuitBoard } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { HealthRing } from "@/components/dashboard/HealthRing";
import { MetricCard, ProgressBar, Sparkline } from "@/components/dashboard/MetricCard";
import { InfoPanel, InfoRow, HwRow, RecRow } from "@/components/dashboard/InfoPanel";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer — Dashboard" },
      { name: "description", content: "Painel central do PC com coleta local somente leitura." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="lightning-bg min-h-screen flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Window chrome */}
        <div className="flex justify-end items-center gap-1 px-4 py-2 text-muted-foreground">
          <button className="w-8 h-8 hover:bg-muted rounded grid place-items-center"><Minus className="w-4 h-4" /></button>
          <button className="w-8 h-8 hover:bg-muted rounded grid place-items-center"><Square className="w-3.5 h-3.5" /></button>
          <button className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive rounded grid place-items-center"><X className="w-4 h-4" /></button>
        </div>

        <main className="flex-1 px-10 pb-6 overflow-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-7">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-primary mb-2">VISÃO GERAL</p>
              <h1 className="text-[34px] leading-tight font-bold tracking-tight text-foreground">Dashboard Hermes</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Status central do PC com coleta local somente leitura. Nenhuma otimização real é executada nesta fase.
              </p>
            </div>
            <div className="rounded-2xl bg-card border border-border/60 px-6 py-4 flex items-center gap-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
              <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground">SAÚDE GERAL</p>
                <p className="text-2xl font-bold leading-none mt-1">97<span className="text-base text-muted-foreground font-medium">/100</span></p>
                <p className="text-[10px] text-muted-foreground mt-1">Excelente • Sistema saudável</p>
              </div>
              <HealthRing value={97} />
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            <MetricCard icon={Heart} label="Saúde geral" value="97/100" sub="Excelente • Sistema saudável">
              <Sparkline />
            </MetricCard>
            <MetricCard icon={Cpu} label="CPU" value="23%" footer={<>12th Gen Intel Core i5-1235U<br />10 núcleos • 1.30 GHz</>}>
              <ProgressBar value={23} gradient="from-primary to-info" />
            </MetricCard>
            <MetricCard icon={MemoryStick} label="RAM" value="53%" footer={<>8.3 GB usados • 7.4 GB livres<br />Total 15.7 GB</>}>
              <ProgressBar value={53} gradient="from-primary to-purple-accent" />
            </MetricCard>
            <MetricCard icon={HardDrive} label="Disco principal (C:)" value="49%" footer={<>235 GB livres de 456 GB<br />SSD • Saudável</>}>
              <ProgressBar value={49} gradient="from-info to-primary" />
            </MetricCard>
          </div>

          {/* Three panels */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <InfoPanel title="SISTEMA">
              <InfoRow icon={Monitor} label="Computador:" value="DRT" />
              <InfoRow icon={Cog} label="Sistema:" value="Windows 11 Home Single Language" />
              <InfoRow icon={Disc} label="Versão:" value="10.0.26200 (Build 26200)" />
              <InfoRow icon={CircuitBoard} label="Arquitetura:" value="64 bits" />
              <InfoRow icon={Clock} label="Tempo ligado:" value="2h 34m" />
              <InfoRow icon={Download} label="Coleta:" value="Somente leitura (local)" />
            </InfoPanel>

            <InfoPanel title="HARDWARE DETALHADO">
              <HwRow icon={Cpu} label="CPU" primary="Intel Core i5-1235U" secondary="10 núcleos • 12 threads" />
              <HwRow icon={MemoryStick} label="MEMÓRIA RAM" primary="15.7 GB DDR4" secondary="8.3 GB usados (53%)" />
              <HwRow icon={Monitor} label="GPU" primary="Intel Iris Xe Graphics" secondary="Integrada • Driver 31.0.101.5445" />
              <HwRow icon={HardDrive} label="DISCO PRINCIPAL" primary="NVMe KBG40ZNS512G" secondary="SSD • 456 GB • 49% usado" />
              <HwRow icon={CircuitBoard} label="PLACA-MÃE" primary="Fabricante: LENOVO" secondary="Modelo: LNVNB161216" />
            </InfoPanel>

            <InfoPanel title="RECOMENDAÇÕES HERMES">
              <RecRow icon={CheckCircle2} color="bg-success/15 text-success" title="Seu sistema está saudável" desc="Todos os componentes principais estão dentro dos parâmetros normais." />
              <RecRow icon={Info} color="bg-info/15 text-info" title="Muitos itens na inicialização" desc="17 programas iniciam com o Windows. Impacto estimado: +11s no boot." />
              <RecRow icon={AlertTriangle} color="bg-warning/15 text-warning" title="Espaço em disco" desc="Seu disco está com 49% de uso. Mantenha acima de 20% livre para máximo desempenho." />
              <RecRow icon={Gamepad2} color="bg-purple-accent/15 text-purple-accent" title="GPU integrada detectada" desc="Para melhor desempenho em jogos, considere GPU dedicada no futuro." />
              <button className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Ver todas as recomendações →
              </button>
            </InfoPanel>
          </div>

          {/* Status bar */}
          <div className="rounded-2xl bg-card border border-border/60 p-3 flex items-center gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <StatusItem icon={Zap} label="INICIALIZAÇÃO" value="17 itens" sub="Médio impacto" />
            <div className="w-px h-12 bg-border" />
            <StatusItem icon={Clock} label="UPTIME" value="2h 34m" sub="Sistema estável" />
            <div className="w-px h-12 bg-border" />
            <StatusItem icon={Shield} label="SEGURANÇA" value="Ativo" sub="Windows Defender" />
            <div className="w-px h-12 bg-border" />
            <StatusItem icon={RefreshCw} label="ATUALIZAÇÕES" value="Em dia" sub="Última verificação hoje" />
            <button
              className="group ml-auto shrink-0 relative overflow-hidden flex items-center gap-4 pl-4 pr-6 h-[80px] w-[340px] rounded-2xl text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.62 0.24 255) 0%, oklch(0.55 0.22 260) 50%, oklch(0.5 0.22 265) 100%)",
                boxShadow:
                  "0 10px 30px -8px color-mix(in oklab, var(--primary) 55%, transparent), 0 0 0 1px color-mix(in oklab, var(--primary) 40%, transparent) inset, 0 1px 0 rgba(255,255,255,0.25) inset",
              }}
            >
              {/* shine overlay */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)",
                }}
              />
              {/* glow edge */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity"
                style={{
                  boxShadow:
                    "0 0 24px color-mix(in oklab, var(--primary) 60%, transparent), 0 0 48px color-mix(in oklab, var(--info) 35%, transparent)",
                }}
              />
              <span className="relative w-12 h-12 rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" fill="currentColor" />
              </span>
              <span className="relative flex flex-col items-start leading-tight text-left">
                <span className="text-[17px] font-extrabold tracking-wide">OTIMIZAR AGORA</span>
                <span className="text-[11px] font-medium text-white/80 mt-0.5">Análise e segurança engine (PRO)</span>
              </span>
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            Hermes Optimizer 0.1.0 • Somente leitura • Nenhuma alteração é feita no sistema
          </p>
        </main>
      </div>
    </div>
  );
}

function StatusItem({ icon: Icon, label, value, sub }: { icon: typeof Zap; label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 px-3 flex-1 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
        <p className="text-base font-semibold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}
