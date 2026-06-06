import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Configuracoes" },
      { name: "description", content: "Configuracoes locais do Hermes Optimizer." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  return (
    <div className="lightning-bg min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-5 pt-6 pb-4 overflow-auto xl:px-8 xl:pt-7">
          <h1 className="text-[clamp(26px,2vw,32px)] leading-tight font-bold tracking-tight text-foreground">Configuracoes</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Rota preparada para as configuracoes locais do Hermes.</p>
        </main>
      </div>
    </div>
  );
}
