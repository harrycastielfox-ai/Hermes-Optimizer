import type { PropsWithChildren } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useUxMode } from "../../app/UxModeContext";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: PropsWithChildren) {
  const { advancedMode, enterAdvancedMode } = useUxMode();
  const navigate = useNavigate();
  const location = useLocation();

  function openAdvancedMode() {
    enterAdvancedMode();
    if (location.pathname === "/" || location.pathname === "/modo-gamer" || location.pathname === "/restauracao") {
      navigate("/diagnostico");
    }
  }

  return (
    <div className="min-h-screen text-stone-900">
      {advancedMode ? <Sidebar /> : null}
      <main className={`${advancedMode ? "ml-72" : ""} min-h-screen px-8 py-7 transition-all duration-300`}>
        {!advancedMode ? (
          <header className="mx-auto mb-8 flex max-w-7xl items-center justify-between rounded-[2rem] border border-white/80 bg-white/78 px-5 py-4 shadow-premium backdrop-blur-xl">
            <NavLink to="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-lg font-black text-white shadow-gold">⚡</span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">Hermes</span>
                <strong className="block text-lg text-stone-950">Optimizer</strong>
              </span>
            </NavLink>
            <nav className="flex items-center gap-2 text-sm font-semibold text-stone-500">
              <NavLink to="/" className={({ isActive }) => `rounded-full px-4 py-2 transition ${isActive ? "bg-amber-100 text-amber-900" : "hover:bg-white hover:text-stone-950"}`}>Início</NavLink>
              <NavLink to="/modo-gamer" className={({ isActive }) => `rounded-full px-4 py-2 transition ${isActive ? "bg-amber-100 text-amber-900" : "hover:bg-white hover:text-stone-950"}`}>Modo Gamer</NavLink>
              <NavLink to="/restauracao" className={({ isActive }) => `rounded-full px-4 py-2 transition ${isActive ? "bg-amber-100 text-amber-900" : "hover:bg-white hover:text-stone-950"}`}>Restauração</NavLink>
              <button className="ml-3 rounded-full border border-stone-200 bg-white px-4 py-2 text-stone-500 transition hover:border-amber-300 hover:text-amber-800" onClick={openAdvancedMode}>Modo Avançado</button>
            </nav>
          </header>
        ) : null}
        <div className={advancedMode ? "" : "mx-auto max-w-7xl"}>{children}</div>
      </main>
    </div>
  );
}
