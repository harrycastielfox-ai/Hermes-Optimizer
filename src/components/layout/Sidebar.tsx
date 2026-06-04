import { NavLink } from "react-router-dom";
import { useUxMode } from "../../app/UxModeContext";

const advancedItems = [
  ["/diagnostico", "Diagnóstico"],
  ["/benchmark", "Benchmark"],
  ["/limpeza", "Limpeza"],
  ["/inicializacao", "Inicialização"],
  ["/otimizacoes", "Tweaks"],
  ["/perfis", "Perfis"],
  ["/restauracao", "Restauração detalhada"],
  ["/historico", "Histórico"],
  ["/logs", "Logs"],
  ["/configuracoes", "Configurações"],
];

export function Sidebar() {
  const { exitAdvancedMode } = useUxMode();

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 border-r border-stone-200 bg-white/88 p-5 shadow-[18px_0_60px_rgba(120,92,32,0.08)] backdrop-blur-xl">
      <div className="rounded-[1.7rem] border border-amber-200/70 bg-gradient-to-br from-white via-amber-50/75 to-stone-100 p-5 shadow-premium">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">Hermes</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-950">Optimizer</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">Modo Avançado: módulos técnicos preservados para usuários experientes.</p>
      </div>

      <nav className="mt-6 space-y-1">
        <NavLink
          to="/"
          className="block rounded-2xl px-4 py-3 text-sm font-semibold text-stone-500 transition hover:bg-amber-50 hover:text-stone-950"
          onClick={exitAdvancedMode}
        >
          ← Voltar ao Modo Simples
        </NavLink>
        <div className="my-4 h-px bg-stone-200" />
        {advancedItems.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-amber-100/80 text-amber-900 shadow-sm"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-950"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
