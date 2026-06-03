export function LoadingState({ label = "Carregando dados seguros..." }: { label?: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5 text-sm text-slate-300">{label}</div>;
}

export function ApiNotice({ error, fallback }: { error?: string; fallback?: boolean }) {
  if (!error && !fallback) return null;
  return (
    <div className="mb-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-100">
      {fallback ? "Fallback web/mock ativo: a interface está usando dados simulados seguros porque o runtime Tauri não está disponível ou a chamada falhou." : null}
      {error ? <span className="block text-amber-100">Detalhe: {error}</span> : null}
    </div>
  );
}
