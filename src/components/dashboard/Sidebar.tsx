import { Home, Stethoscope, Zap, Sparkles, Beaker, UserCog, Settings } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

const items = [
  { icon: Home, label: "Dashboard", to: "/" },
  { icon: Stethoscope, label: "Diagnóstico", to: "/diagnostico" },
  { icon: Zap, label: "Inicialização", to: "/inicializacao" },
  { icon: Sparkles, label: "Otimizações", to: "/otimizacoes" },
  { icon: Beaker, label: "Limpeza", to: "/limpeza" },
  { icon: UserCog, label: "Perfis", to: "/perfis" },
  { icon: Settings, label: "Configurações", to: "/configuracoes" },
] as const;

export function Sidebar() {
  const { pathname } = useLocation();
  const [gamer, setGamer] = useState(false);
  const [logoMissing, setLogoMissing] = useState(false);

  return (
    <aside className="sidebar-texture w-[230px] 2xl:w-[260px] shrink-0 flex flex-col px-4 py-5 2xl:px-5 2xl:py-6 border-r border-slate-200/80">
      <div className="relative z-10 flex items-center justify-center mb-6 2xl:mb-8 pt-1">
        {logoMissing ? (
          <span className="text-lg font-bold tracking-tight text-slate-900">Hermes Optimizer</span>
        ) : (
          <img
            src="/hermes-logo.png"
            alt="Hermes Optimizer"
            className="w-[178px] 2xl:w-[205px] max-h-[134px] 2xl:max-h-[154px] h-auto object-contain drop-shadow-[0_14px_24px_rgba(37,99,235,0.16)]"
            onError={() => setLogoMissing(true)}
          />
        )}
      </div>

      <nav className="relative z-10 flex-1 flex flex-col gap-1 2xl:gap-1.5">
        {items.map(({ icon: Icon, label, to }) => {
          const isActive = pathname === to;
          return (
            <Link
              key={label}
              to={to}
              className={`group flex items-center gap-3 px-3.5 py-2.5 2xl:px-4 2xl:py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-[0_12px_26px_-13px_rgba(37,99,235,0.95),0_0_0_1px_rgba(255,255,255,0.34)_inset]"
                  : "text-slate-700 hover:bg-white/[0.72] hover:text-slate-950 hover:shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)]"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-all duration-200 ${
                  isActive ? "bg-white/[0.16] text-white" : "bg-slate-900/[0.04] text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 2} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 mt-auto rounded-[1.1rem] 2xl:rounded-[1.35rem] border border-white/80 bg-white/[0.78] p-3 2xl:p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.55),0_0_0_1px_rgba(37,99,235,0.06)_inset] backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 shadow-[0_0_0_1px_rgba(37,99,235,0.08)_inset]">
            <Zap className="w-[18px] h-[18px] text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500">MODO GAMER</p>
            <p className="text-sm font-bold text-slate-950">{gamer ? "Ativado" : "Desativado"}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] leading-snug text-slate-500">Ative para máximo desempenho</p>
          <button
            type="button"
            aria-pressed={gamer}
            aria-label="Alternar Modo Gamer"
            onClick={() => setGamer((v) => !v)}
            className={`relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-all duration-200 ${
              gamer ? "bg-blue-600 shadow-[0_0_18px_rgba(37,99,235,0.35)]" : "bg-slate-200 shadow-inner"
            }`}
          >
            <span
              className={`block h-6 w-6 rounded-full bg-white shadow-[0_3px_10px_rgba(15,23,42,0.18)] transition-transform duration-200 ${
                gamer ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
