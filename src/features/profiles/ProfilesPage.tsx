import { useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { RiskBadge } from "../../components/badges/RiskBadge";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { listPerformanceProfiles, simulateApplyProfile } from "../../lib/tauri";
import type { PerformanceProfile } from "../../lib/types";

export function ProfilesPage() {
  const [profile, setProfile] = useState<PerformanceProfile | null>(null);
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const { data: profiles, loading, error, fallback } = useHermesResource(listPerformanceProfiles);

  async function confirmProfile() {
    if (!profile) return;
    const result = await simulateApplyProfile(profile.id);
    setActionMessage(result.data.message);
    setProfile(null);
  }

  return (
    <>
      <PageHeader eyebrow="Perfis de desempenho" title="Perfis Hermes" description="Presets comerciais com objetivo, risco e confirmação antes de qualquer aplicação real futura." />
      <ApiNotice error={error} fallback={fallback} />
      {actionMessage && <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">{actionMessage}</div>}
      {loading || !profiles ? <LoadingState /> : (
        <div className="grid grid-cols-2 gap-5">
          {profiles.map((item) => (
            <SectionCard key={item.id} title={item.name} description={item.description}>
              <div className="flex items-center justify-between"><p className="text-sm text-slate-300">Objetivo: <strong className="text-white">{item.objective}</strong></p><RiskBadge risk={item.risk} /></div>
              <p className="mt-4 text-sm text-slate-300">Tweaks aplicados: {item.tweakCount}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">{item.includedTweaks.map((tweak) => <li key={tweak}>• {tweak}</li>)}</ul>
              <div className="mt-6 flex gap-3"><PrimaryButton variant="secondary">Ver detalhes</PrimaryButton><PrimaryButton onClick={() => setProfile(item)}>Aplicar perfil</PrimaryButton></div>
            </SectionCard>
          ))}
        </div>
      )}
      <ConfirmModal open={profile !== null} title={`Aplicar ${profile?.name ?? "perfil"}?`} description="Aplicação apenas simulada. Um snapshot lógico seria criado antes de alterações reais futuras, com logs e reversão quando aplicável." riskNote={profile?.risk === "high" ? "Perfil de alto risco. Na versão inicial ele é apenas visual/simulado e não altera serviços, registro ou segurança." : undefined} onCancel={() => setProfile(null)} onConfirm={confirmProfile} />
    </>
  );
}
