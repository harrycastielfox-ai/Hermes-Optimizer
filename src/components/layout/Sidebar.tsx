import { NavLink } from "react-router-dom";

const navItems = [
  ["/", "Dashboard", "⌂"],
  ["/diagnostico", "Diagnóstico", "⚙"],
  ["/inicializacao", "Inicialização", "↯"],
  ["/otimizacoes", "Otimizações", "🛠"],
  ["/limpeza", "Limpeza", "♙"],
  ["/modo-gamer", "Modo Gamer", "🎮"],
  ["/perfis", "Perfis", "☼"],
  ["/restauracao", "Restauração", "↶"],
  ["/logs", "Logs", "▤"],
  ["/configuracoes", "Configurações", "⚙"],
];

export function Sidebar() {
  return (
    <aside className="hermes-sidebar fixed left-0 top-0 z-20 flex h-screen w-80 flex-col border-r border-white/80 bg-white/55 px-8 py-8 shadow-[24px_0_90px_rgba(37,99,235,0.10)] backdrop-blur-2xl">
      <div className="relative mx-auto h-48 w-48">
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-100 via-white to-slate-200 shadow-[inset_0_0_30px_rgba(37,99,235,0.16),0_18px_40px_rgba(37,99,235,0.14)]" />
        <div className="absolute inset-0 rounded-full border border-white/90" />
        <div className="absolute inset-x-0 top-7 text-center text-[3.6rem] drop-shadow-sm">🪽</div>
        <div className="absolute bottom-7 left-1/2 w-44 -translate-x-1/2 rounded-xl border border-slate-300 bg-gradient-to-b from-white to-slate-200 px-3 py-2 text-center shadow-xl">
          <strong className="block text-3xl font-black italic tracking-tighter text-slate-800">HERMES</strong>
          <span className="block text-[0.62rem] font-black uppercase tracking-[0.55em] text-slate-500">Optimizer</span>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-2">
        {navItems.map(([to, label, icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_16px_34px_rgba(37,99,235,0.32)]"
                  : "text-slate-700 hover:bg-white/75 hover:text-blue-700"
              }`
            }
          >
            <span className="grid h-6 w-6 place-items-center text-lg">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="rounded-2xl border border-white/80 bg-white/62 p-4 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-xl text-blue-600">↯</span>
          <div className="text-xs">
            <p className="font-black uppercase tracking-[0.18em] text-slate-500">Modo Gamer</p>
            <p className="mt-1 font-semibold text-slate-900">Desativado</p>
            <p className="text-slate-500">Ative para máximo desempenho</p>
          </div>
          <span className="ml-auto h-6 w-10 rounded-full bg-slate-300 shadow-inner" />
        </div>
      </div>
    </aside>
  );
}
