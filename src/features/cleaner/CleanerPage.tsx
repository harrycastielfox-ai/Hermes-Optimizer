import { useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { scanTempFiles } from "../../lib/tauri";
import { formatMb } from "../../lib/utils/format";

export function CleanerPage() {
  const [confirm, setConfirm] = useState(false);
  const { data: categories, loading, error, fallback } = useHermesResource(scanTempFiles);
  const total = (categories ?? []).filter((category) => category.selected).reduce((sum, category) => sum + category.estimatedSizeMb, 0);

  return (
    <>
      <PageHeader eyebrow="Disco" title="Limpeza" description="" />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !categories ? <LoadingState /> : (
        <section className="rounded-3xl border border-slate-200 bg-white/86 p-8 shadow-[0_24px_75px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-6"><div><h2 className="font-serif text-3xl uppercase text-slate-950">Limpeza segura</h2><p className="mt-1 text-lg text-slate-600">Nunca apagamos Downloads. Tudo aparece antes de remover.</p></div><div className="flex gap-3"><PrimaryButton variant="ghost">▧ Reescanear</PrimaryButton><PrimaryButton onClick={() => setConfirm(true)}>Limpar agora</PrimaryButton></div></div>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            {categories.slice(0, 5).map((category) => <div key={category.id} className="grid grid-cols-[44px_1fr_120px] items-center gap-4 border-b border-slate-200 px-5 py-6 last:border-b-0"><span className="grid h-5 w-5 place-items-center rounded bg-amber-400 font-black text-slate-800">✓</span><span><strong className="block text-xl text-slate-950">{category.name}</strong><span className="text-slate-600">{category.description}</span></span><span className="text-right text-lg font-medium text-amber-500">{formatMb(category.estimatedSizeMb)}</span></div>)}
          </div>
          <div className="mt-6 flex justify-between text-lg"><span className="text-slate-600">{categories.filter((c) => c.selected).length} itens selecionados</span><strong>Total: <span className="font-medium text-amber-500">{formatMb(total)}</span></strong></div>
        </section>
      )}
      <ConfirmModal open={confirm} title="Confirmar limpeza simulada?" description="Nenhum arquivo será removido. Esta etapa valida UX, logs e arquitetura de confirmação para uma futura limpeza segura via Rust/Tauri." onCancel={() => setConfirm(false)} onConfirm={() => setConfirm(false)} />
    </>
  );
}
