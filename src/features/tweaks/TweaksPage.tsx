import { useMemo, useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { RiskBadge } from "../../components/badges/RiskBadge";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { listAvailableTweaks, simulateApplyTweak } from "../../lib/tauri";
import type { HermesTweak } from "../../lib/types";

export function TweaksPage() {
  const [selected, setSelected] = useState<HermesTweak | null>(null);
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const { data: tweaks, loading, error, fallback } = useHermesResource(listAvailableTweaks);
  const groups = useMemo(() => {
    return (tweaks ?? []).reduce<Record<string, HermesTweak[]>>((acc, tweak) => {
      acc[tweak.category] = [...(acc[tweak.category] ?? []), tweak];
      return acc;
    }, {});
  }, [tweaks]);

  async function confirmTweak() {
    if (!selected) return;
    const result = await simulateApplyTweak(selected.id);
    setActionMessage(result.data.message);
    setSelected(null);
  }

  return (
    <>
      <PageHeader eyebrow="Hermes Tweak Engine" title="Otimizações do Windows" description="Catálogo seguro e transparente. Nesta primeira versão, os tweaks são apenas simulados e não alteram registro, serviços ou segurança do Windows." />
      <ApiNotice error={error} fallback={fallback} />
      {actionMessage && <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">{actionMessage}</div>}
      {loading || !tweaks ? <LoadingState /> : (
        <div className="space-y-5">
          {Object.entries(groups).map(([category, items]) => (
            <SectionCard key={category} title={category} description={`${items.length} tweaks preparados para execução futura via backend Rust/Tauri.`}>
              <div className="grid grid-cols-2 gap-4">
                {items.map((tweak) => (
                  <article key={tweak.id} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{tweak.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{tweak.description}</p>
                      </div>
                      <RiskBadge risk={tweak.risk} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1">Modo {tweak.mode}</span>
                      <span className="rounded-full bg-slate-800 px-2.5 py-1">{tweak.reversible ? "Reversível" : "Não reversível"}</span>
                      {tweak.requiresAdmin && <span className="rounded-full bg-slate-800 px-2.5 py-1">Admin futuro</span>}
                      {tweak.recommended && <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-200">Recomendado</span>}
                    </div>
                    <p className="mt-3 text-sm text-cyan-100">Benefício: {tweak.benefit}</p>
                    {tweak.warning && <p className="mt-2 text-sm text-amber-200">Aviso: {tweak.warning}</p>}
                    <div className="mt-4"><PrimaryButton variant={tweak.risk === "high" ? "danger" : "secondary"} onClick={() => setSelected(tweak)}>Simular aplicação</PrimaryButton></div>
                  </article>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
      <ConfirmModal open={selected !== null} title={`Simular tweak: ${selected?.name ?? ""}`} description="O Hermes mostrará exatamente o que seria alterado e registrará a ação como simulação. Nenhum comando real será executado nesta etapa." riskNote={selected?.warning} onCancel={() => setSelected(null)} onConfirm={confirmTweak} />
    </>
  );
}
