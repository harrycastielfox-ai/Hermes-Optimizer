import { useCallback, useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { createRestoreSnapshot, simulateRestoreSnapshot } from "../../lib/tauri";

export function RestorePage() {
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
      <PageHeader eyebrow="Backup e reversão" title="Central de restauração" description="Histórico de snapshots simulados para construir confiança e preparar reversão real no backend." />
      <ApiNotice error={error} fallback={fallback} />
      {actionMessage && <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">{actionMessage}</div>}
      {loading ? <LoadingState /> : (
        <SectionCard title="Snapshots disponíveis" description="Toda otimização real futura deverá criar snapshot quando aplicável.">
          <div className="space-y-4">
            {snapshots.map((snap) => <article key={snap.id} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-white">{snap.profileApplied}</h3><p className="mt-2 text-sm text-slate-400">{snap.date} • Status: {snap.status}</p><p className="mt-2 text-sm text-slate-300">Tweaks: {snap.tweaksApplied.join(", ") || "snapshot lógico"}</p></div><PrimaryButton variant="secondary" disabled={!snap.reversible} onClick={() => setSnapshotId(snap.id)}>Restaurar</PrimaryButton></div></article>)}
          </div>
        </SectionCard>
      )}
      <ConfirmModal open={snapshotId !== null} title="Restaurar snapshot simulado?" description="A restauração é apenas visual nesta etapa. A arquitetura reserva o caminho para reversão segura e auditável via Rust/Tauri." onCancel={() => setSnapshotId(null)} onConfirm={confirmRestore} />
    </>
  );
}
