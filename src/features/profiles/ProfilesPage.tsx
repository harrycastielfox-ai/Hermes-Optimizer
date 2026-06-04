import { useState } from "react";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { listPerformanceProfiles, simulateApplyProfile } from "../../lib/tauri";
import type { PerformanceProfile } from "../../lib/types";

const icons = ["▰", "🎮", "〽", "↯"];
const labels = ["Escritório", "Gamer", "Streaming", "Extremo"];
const descriptions = ["Equilíbrio entre eficiência e bateria.", "Máxima resposta para jogos.", "Priorize encoder e rede estável.", "Tudo otimizado, requer backup."];

export function ProfilesPage() {
  const [profile, setProfile] = useState<PerformanceProfile | null>(null);
  const { data: profiles, loading, error, fallback } = useHermesResource(listPerformanceProfiles);

  async function confirmProfile() {
    if (!profile) return;
    await simulateApplyProfile(profile.id);
    setProfile(null);
  }

  return (
    <>
      <PageHeader eyebrow="Configurações" title="Perfis" description="Conjuntos de tweaks pré-definidos para cada cenário." />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !profiles ? <LoadingState /> : (
        <div className="grid gap-6 xl:grid-cols-4">
          {profiles.slice(0, 4).map((item, index) => <article key={item.id} className="rounded-3xl border border-slate-200 bg-white/86 p-8 shadow-[0_24px_75px_rgba(15,23,42,0.08)]"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 text-2xl text-slate-950">{icons[index]}</span><h2 className="mt-7 font-serif text-3xl uppercase text-slate-950">{labels[index] ?? item.name}</h2><p className="mt-2 text-slate-600">{descriptions[index] ?? item.description}</p><button onClick={() => setProfile(item)} className="mt-7 w-full rounded-2xl border border-slate-200 bg-white/70 py-3 font-medium">Aplicar</button></article>)}
        </div>
      )}
      <ConfirmModal open={profile !== null} title={`Aplicar ${profile?.name ?? "perfil"}?`} description="Aplicação apenas simulada. Um snapshot lógico seria criado antes de alterações reais futuras." onCancel={() => setProfile(null)} onConfirm={confirmProfile} />
    </>
  );
}
