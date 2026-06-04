import { NavLink } from "react-router-dom";

const items = [
  ["/", "Dashboard"],
  ["/diagnostico", "Diagnóstico"],
  ["/benchmark", "Benchmark"],
  ["/limpeza", "Limpeza"],
  ["/inicializacao", "Inicialização"],
  ["/otimizacoes", "Otimizações"],
  ["/modo-gamer", "Modo Gamer"],
  ["/perfis", "Perfis"],
  ["/restauracao", "Restauração"],
  ["/historico", "Histórico"],
  ["/logs", "Logs"],
  ["/configuracoes", "Configurações"],
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 border-r border-slate-800 bg-slate-950/80 p-5 backdrop-blur-xl">
      <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 to-violet-500/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">Hermes</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Optimizer</h1>
        <p className="mt-2 text-sm text-slate-400">Base segura, modular e pronta para evolução comercial.</p>
      </div>
      <nav className="mt-6 space-y-1">
        {items.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive ? "bg-cyan-400/15 text-cyan-100" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
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
