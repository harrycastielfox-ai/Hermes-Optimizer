import { useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { SectionCard } from "../../components/cards/SectionCard";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { gamerApps } from "../../lib/mock-data/hermesData";

function profileLabel(value: string) {
  if (value === "high-performance") return "Alto desempenho";
  if (value === "ultimate") return "Máximo";
  return "Balanceado";
}

export function GamerPage() {
  const [modal, setModal] = useState<"start" | "restore" | null>(null);
  const selectedGame = gamerApps[0];

  return (
    <>
      <PageHeader eyebrow="Modo simples" title="Modo Gamer" description="Uma sessão simples para jogar com foco em desempenho e restauração rápida ao terminar." />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-gradient-to-br from-white via-amber-50/85 to-stone-100 p-8 shadow-premium">
          <div className="absolute right-8 top-6 text-[9rem] leading-none text-amber-200/30">🎮</div>
          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">Perfil Gamer</p>
            <h1 className="mt-4 text-4xl font-black text-stone-950">Preparar o PC para jogar.</h1>
            <p className="mt-4 text-base leading-8 text-stone-600">O Hermes oculta processos, planos e ajustes internos. Você só escolhe iniciar ou restaurar a sessão.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryButton className="px-6 py-3 text-base" onClick={() => setModal("start")}>🎮 Ativar Modo Gamer</PrimaryButton>
              <PrimaryButton variant="ghost" className="px-6 py-3 text-base" onClick={() => setModal("restore")}>🔄 Restaurar Sessão</PrimaryButton>
            </div>
          </div>
        </section>

        <SectionCard title="Jogo selecionado" description="A seleção avançada de executável fica oculta nesta experiência comercial.">
          <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/70 p-5">
            <p className="text-sm font-semibold text-stone-500">Jogo</p>
            <h2 className="mt-2 text-2xl font-black text-stone-950">{selectedGame.name}</h2>
            <p className="mt-3 truncate font-mono text-xs text-stone-500">{selectedGame.executablePath}</p>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-stone-600">
            <div className="rounded-2xl border border-stone-200 bg-white p-4"><strong className="text-stone-950">Perfil gráfico:</strong> {profileLabel(selectedGame.graphicsProfile)}</div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4"><strong className="text-stone-950">Energia:</strong> {profileLabel(selectedGame.powerPlan)}</div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4"><strong className="text-stone-950">Restauração:</strong> {selectedGame.restoreOnExit ? "automática ao sair" : "manual"}</div>
          </div>
        </SectionCard>
      </div>
      <ConfirmModal open={modal !== null} title={modal === "start" ? "Ativar Modo Gamer?" : "Restaurar sessão gamer?"} description="O fluxo continua seguro e reversível. A complexidade técnica fica reservada ao Modo Avançado." onCancel={() => setModal(null)} onConfirm={() => setModal(null)} />
    </>
  );
}
