export function LoadingState({ label = "Carregando dados seguros..." }: { label?: string }) {
  return <div className="rounded-2xl border border-white/80 bg-white/78 p-5 text-sm text-stone-500 shadow-premium">{label}</div>;
}

export function ApiNotice({ error, fallback }: { error?: string; fallback?: boolean }) {
  if (!error && !fallback) return null;
  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900 shadow-premium">
      {fallback ? "Fallback web/mock ativo: a interface está usando dados simulados seguros porque o runtime Tauri não está disponível ou a chamada falhou." : null}
      {error ? <span className="block text-stone-700">Detalhe: {error}</span> : null}
    </div>
  );
}
