import { useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { SectionCard } from "../../components/cards/SectionCard";
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
      <PageHeader eyebrow="Limpeza segura" title="Limpeza inteligente" description="Categorias revisáveis, tamanho estimado e confirmação obrigatória. Downloads e documentos pessoais nunca entram na limpeza automática." />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !categories ? <LoadingState /> : (
        <SectionCard title="Categorias de limpeza" description={`Selecionado para simulação: ${formatMb(total)}.`}>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <article key={category.id} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-white">{category.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{category.description}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-100">{formatMb(category.estimatedSizeMb)}</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">Confirmação: obrigatória • Reversível: {category.reversible ? "quando aplicável" : "não"}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex justify-end"><PrimaryButton onClick={() => setConfirm(true)}>Simular limpeza selecionada</PrimaryButton></div>
        </SectionCard>
      )}
      <ConfirmModal open={confirm} title="Confirmar limpeza simulada?" description="Nenhum arquivo será removido. Esta etapa valida UX, logs e arquitetura de confirmação para uma futura limpeza segura via Rust/Tauri." onCancel={() => setConfirm(false)} onConfirm={() => setConfirm(false)} />
    </>
  );
}
