import { useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";

const processes = [
  ["chrome.exe (8 abas)", "Não essencial", "1.9 GB", true],
  ["Discord.exe", "Não essencial", "420 MB", true],
  ["Spotify.exe", "Não essencial", "260 MB", true],
  ["explorer.exe", "Essencial do sistema · protegido", "180 MB", false],
] as const;

export function GamerPage() {
  const [modal, setModal] = useState<"apply" | "restore" | null>(null);
  const profiles = ["Escritório", "Gamer", "Streaming", "Extremo"];

  return (
    <>
      <PageHeader eyebrow="Performance" title="Modo Gamer" description="" />
      <div className="grid gap-7 xl:grid-cols-[1fr_0.48fr]">
        <section className="rounded-3xl border border-slate-200 bg-white/86 p-8 shadow-[0_24px_75px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between"><div><h2 className="font-serif text-3xl uppercase text-slate-950">Modo desempenho</h2><p className="mt-1 text-lg text-slate-600">Sugerimos processos não essenciais. Você escolhe o que fechar.</p></div><PrimaryButton variant="ghost" onClick={() => setModal("restore")}>↻ Reverter otimização</PrimaryButton></div>
          <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200">{processes.map(([name, desc, size, selected]) => <div key={name} className="grid grid-cols-[44px_1fr_120px] items-center gap-4 border-b border-slate-200 px-5 py-6 last:border-b-0"><span className={`grid h-5 w-5 place-items-center rounded border ${selected ? 'border-amber-500 bg-amber-400 text-slate-800' : 'border-slate-300 bg-white text-transparent'}`}>✓</span><span><strong className="block text-xl text-slate-950">{name}</strong><span className="text-slate-600">{desc}</span></span><span className="text-right text-lg text-slate-950">{size}</span></div>)}</div>
        </section>
        <aside className="rounded-3xl border border-slate-200 bg-white/86 p-8 shadow-[0_24px_75px_rgba(15,23,42,0.08)]"><h2 className="font-serif text-3xl uppercase text-slate-950">Perfis</h2><div className="mt-6 space-y-3">{profiles.map((profile) => <button key={profile} className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left text-lg font-semibold ${profile === 'Gamer' ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white/70'}`}>{profile}<span className="text-amber-500">☄</span></button>)}</div><button onClick={() => setModal("apply")} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 py-4 text-lg font-medium text-slate-950">Aplicar perfil Gamer</button></aside>
      </div>
      <ConfirmModal open={modal === "apply"} title="Aplicar perfil Gamer?" description="Aplicação apenas simulada. Nenhuma otimização real será executada nesta fase." onCancel={() => setModal(null)} onConfirm={() => setModal(null)} />
      <ConfirmModal open={modal === "restore"} title="Reverter otimização?" description="Restauração visual/simulada para validar fluxo de segurança." onCancel={() => setModal(null)} onConfirm={() => setModal(null)} />
    </>
  );
}
