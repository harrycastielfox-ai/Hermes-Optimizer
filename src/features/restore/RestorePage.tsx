import { useCallback, useState } from "react";
import { useUxMode } from "../../app/UxModeContext";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { createRestoreSnapshot, simulateRestoreSnapshot } from "../../lib/tauri";

export function RestorePage() {
  const { advancedMode } = useUxMode();
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const loadSnapshot = useCallback(() => createRestoreSnapshot("restore-center-preview"), []);
  const { data: snapshot, loading, error, fallback } = useHermesResource(loadSnapshot);
  const snapshots = snapshot ? [snapshot] : [];

  async function confirmRestore() {
    if (!snapshotId) return;
    const result = await simulateRestoreSnapshot(snapshotId);
    setActionMessage(`Snapshot ${result.data.id} restaurado em modo ${result.data.status}.`);
    setSnapshotId(null);
  }

  return (
    <>
      <PageHeader
        eyebrow={advancedMode ? "Backup e reversão" : "Modo simples"}
        title={advancedMode ? "Central de restauração detalhada" : "Restaurar Alterações"}
        description={advancedMode ? "Histórico de snapshots simulados para construir confiança e preparar reversão real no backend." : "Uma central curta para voltar ao último estado conhecido sem expor detalhes técnicos."}
      />
      <ApiNotice error={error} fallback={fallback} />
      {actionMessage && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-premium">{actionMessage}</div>}
      {loading ? <LoadingState /> : (
        <SectionCard title={advancedMode ? "Snapshots disponíveis" : "Último snapshot"} description={advancedMode ? "Toda otimização real futura deverá criar snapshot quando aplicável." : "O Hermes mostra apenas o ponto de restauração mais relevante."}>
          <div className="space-y-4">
            {snapshots.map((snap) => (
              <article key={snap.id} className="rounded-[1.5rem] border border-stone-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-500">Último snapshot</p>
                    <h3 className="mt-1 text-2xl font-black text-stone-950">{snap.profileApplied}</h3>
                    <p className="mt-2 text-sm text-stone-500">Data: {snap.date}</p>
                    {advancedMode ? <p className="mt-2 text-sm text-stone-600">Tweaks: {snap.tweaksApplied.join(", ") || "snapshot lógico"} • Status: {snap.status}</p> : null}
                  </div>
                  <PrimaryButton disabled={!snap.reversible} onClick={() => setSnapshotId(snap.id)}>🔄 Restaurar</PrimaryButton>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      )}
      <ConfirmModal open={snapshotId !== null} title="Restaurar snapshot?" description="A restauração é visual nesta etapa. A arquitetura reserva o caminho para reversão segura e auditável via Rust/Tauri." onCancel={() => setSnapshotId(null)} onConfirm={confirmRestore} />
    </>
  );
}
