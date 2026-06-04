import { PrimaryButton } from "../buttons/PrimaryButton";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  riskNote?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({ open, title, description, confirmLabel = "Confirmar simulação", riskNote, onCancel, onConfirm }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white p-6 shadow-premium">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">Confirmação obrigatória</p>
        <h2 className="mt-3 text-2xl font-bold text-stone-950">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {riskNote ?? "Esta versão inicial apenas simula a ação. Nenhuma alteração real será aplicada no Windows."}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <PrimaryButton variant="ghost" onClick={onCancel}>Cancelar</PrimaryButton>
          <PrimaryButton onClick={onConfirm}>{confirmLabel}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
