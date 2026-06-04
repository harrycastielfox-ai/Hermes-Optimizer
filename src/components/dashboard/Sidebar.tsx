import { Home, Stethoscope, Zap, Sparkles, Beaker, Gamepad2, UserCog, History, FileText, Settings } from "lucide-react";
import { useState } from "react";

const items = [
  { icon: Home, label: "Dashboard" },
  { icon: Stethoscope, label: "Diagnóstico" },
  { icon: Zap, label: "Inicialização" },
  { icon: Sparkles, label: "Otimizações" },
  { icon: Beaker, label: "Limpeza" },
  { icon: Gamepad2, label: "Modo Gamer" },
  { icon: UserCog, label: "Perfis" },
  { icon: History, label: "Restauração" },
  { icon: FileText, label: "Logs" },
  { icon: Settings, label: "Configurações" },
];

export function Sidebar() {
  const [active, setActive] = useState("Dashboard");
  const [gamer, setGamer] = useState(false);
  const [logoMissing, setLogoMissing] = useState(false);

  return (
    <aside className="sidebar-texture w-[260px] shrink-0 flex flex-col px-5 py-6 border-r border-border/60">
      <div className="flex items-center justify-center mb-8">
        {logoMissing ? (
          <span className="text-lg font-bold tracking-tight text-foreground">Hermes Optimizer</span>
        ) : (
          <img
            src="/hermes-logo.png"
            alt="Hermes Optimizer"
            className="w-[180px] h-auto object-contain drop-shadow-sm"
            onError={() => setLogoMissing(true)}
          />
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {items.map(({ icon: Icon, label }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "text-foreground/70 hover:bg-primary-soft hover:text-foreground"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 2} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 rounded-2xl bg-card/80 backdrop-blur border border-border/60 p-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">MODO GAMER</p>
          <p className="text-sm font-semibold">{gamer ? "Ativado" : "Desativado"}</p>
          <p className="text-[10px] text-muted-foreground truncate">Ative para máximo desempenho</p>
        </div>
        <button
          onClick={() => setGamer((v) => !v)}
          className={`w-10 h-6 rounded-full transition-colors relative ${gamer ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${gamer ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </div>
    </aside>
  );
}
