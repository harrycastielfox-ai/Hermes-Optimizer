import { useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { SectionCard } from "../../components/cards/SectionCard";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { gamerApps } from "../../lib/mock-data/hermesData";

export function GamerPage() {
  const [modal, setModal] = useState<"start" | "restore" | null>(null);
  return (
    <>
      <PageHeader eyebrow="Modo Gamer" title="Sessões de jogo com restauração" description="Seleção visual de .exe, perfil gráfico, plano de energia e processos opcionais. Tudo mockado nesta primeira entrega." />
      <div className="grid grid-cols-3 gap-5">
        <SectionCard title="Adicionar jogo/app" description="Preparado para seletor nativo futuro via Tauri.">
          <label className="text-sm text-slate-400">Executável .exe</label>
          <div className="mt-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 font-mono text-sm text-slate-500">C:\Games\SeuJogo\game.exe</div>
          <div className="mt-4 grid gap-3"><select className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200"><option>Gráficos: Alto desempenho</option><option>Gráficos: Balanceado</option></select><select className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200"><option>Energia: Alto desempenho</option><option>Energia: Equilibrado</option></select></div>
        </SectionCard>
        <SectionCard title="Jogos adicionados" description="Perfis simulados para demonstrar a UX.">
          {gamerApps.map((app) => <div key={app.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"><h3 className="font-semibold text-white">{app.name}</h3><p className="mt-2 font-mono text-xs text-slate-400">{app.executablePath}</p><p className="mt-3 text-sm text-slate-300">Plano: {app.powerPlan} • Restaurar ao sair: {app.restoreOnExit ? "sim" : "não"}</p></div>)}
        </SectionCard>
        <SectionCard title="Processos antes do jogo" description="Fechamento real exigirá seleção manual e confirmação.">
          <ul className="space-y-2 text-sm text-slate-300"><li>• chat-launcher.exe</li><li>• updater.exe</li><li>• overlay-helper.exe</li></ul>
          <div className="mt-6 flex flex-col gap-3"><PrimaryButton onClick={() => setModal("start")}>Iniciar modo gamer</PrimaryButton><PrimaryButton variant="secondary" onClick={() => setModal("restore")}>Restaurar estado anterior</PrimaryButton></div>
        </SectionCard>
      </div>
      <ConfirmModal open={modal !== null} title={modal === "start" ? "Iniciar modo gamer simulado?" : "Restaurar estado anterior simulado?"} description="O fluxo demonstra confirmação, logs e reversão. Nenhum processo será encerrado e nenhum plano de energia será alterado nesta versão." onCancel={() => setModal(null)} onConfirm={() => setModal(null)} />
    </>
  );
}
