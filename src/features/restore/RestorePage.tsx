import { useCallback, useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { createRestoreSnapshot, simulateRestoreSnapshot } from "../../lib/tauri";

const staticSnapshots = [
  ["Backup automático antes do Modo Gamer", "Hoje · 09:14"],
  ["Pré-tweak — Limpeza de temporários", "Ontem · 18:42"],
  ["Instalação Hermes 1.0", "01/06/2026 · 10:00"],
] as const;

export function RestorePage() {
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const loadSnapshot = useCallback(() => createRestoreSnapshot("restore-center-preview"), []);
  const { data: snapshot, loading, error, fallback } = useHermesResource(loadSnapshot);

  async function confirmRestore() {
    if (!snapshotId) return;
    await simulateRestoreSnapshot(snapshotId);
    setSnapshotId(null);
  }

  return (
    <>
      <PageHeader eyebrow="Segurança" title="Restauração" description="Todos os pontos podem ser revertidos com um clique." />
      <ApiNotice error={error} fallback={fallback} />
      {loading ? <LoadingState /> : (
        <section className="rounded-3xl border border-slate-200 bg-white/86 p-8 shadow-[0_24px_75px_rgba(15,23,42,0.08)]">
          <div className="divide-y divide-slate-200">
            {staticSnapshots.map(([title, date], index) => <article key={title} className="flex items-center justify-between gap-5 py-6 first:pt-0 last:pb-0"><div><h2 className="text-xl font-semibold text-slate-950">{title}</h2><p className="text-slate-600">{date}</p></div><PrimaryButton variant="ghost" onClick={() => setSnapshotId(snapshot?.id ?? `static-${index}`)}>↻ Reverter</PrimaryButton></article>)}
          </div>
        </section>
      )}
      <ConfirmModal open={snapshotId !== null} title="Restaurar snapshot?" description="A restauração é visual nesta etapa. A arquitetura reserva o caminho para reversão segura e auditável via Rust/Tauri." onCancel={() => setSnapshotId(null)} onConfirm={confirmRestore} />
    </>
  );
}
