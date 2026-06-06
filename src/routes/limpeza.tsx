import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Database, FileText, FolderOpen, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { fallbackCleanScanReport, loadCleanScanReport, type CleanScanItem, type CleanScanReport } from "@/lib/clean";

export const Route = createFileRoute("/limpeza")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Limpeza" },
      { name: "description", content: "Scan de limpeza segura local do Hermes Optimizer." },
    ],
  }),
  component: LimpezaPage,
});

function LimpezaPage() {
  const [report, setReport] = useState<CleanScanReport>(fallbackCleanScanReport);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      loadCleanScanReport().then((nextReport) => {
        if (mounted) {
          setReport(nextReport);
        }
      });
    }, 500);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="lightning-bg min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-5 pt-6 pb-4 overflow-auto xl:px-8 xl:pt-7">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.22em] text-primary mb-2">CLEAN ENGINE SCAN</p>
            <h1 className="text-[clamp(26px,2vw,32px)] leading-tight font-bold tracking-tight text-foreground">Limpeza segura</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Scan local de temporarios e caches permitidos. Nenhum arquivo e apagado nesta fase.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4 lg:grid-cols-3">
            <SummaryCard
              icon={Sparkles}
              label="A LIBERAR"
              value={`${formatGb(report.totalGb)} GB`}
              sub="Disponiveis para limpeza"
            />
            <SummaryCard
              icon={CheckCircle2}
              label="ITENS SEGUROS"
              value={`${report.items.length}`}
              sub="Categorias escaneadas"
            />
            <SummaryCard
              icon={ShieldCheck}
              label="PASTAS PROTEGIDAS"
              value="Nunca tocadas"
              sub={report.protectedLocations.slice(0, 3).join(", ")}
            />
          </div>

          <section className="rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-1 mb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-[0.18em] text-primary">ITENS ENCONTRADOS</h2>
                <p className="text-[12px] text-muted-foreground mt-1">
                  {formatGb(report.totalGb)} GB disponiveis para limpeza. Execucao real vira depois com confirmacao.
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">
                Read-only
              </span>
            </div>

            <div className="space-y-2.5">
              {report.items.map((item) => (
                <CleanRow key={item.id} item={item} totalBytes={report.totalBytes} />
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-muted-foreground">
                Protegido: {report.protectedLocations.join(", ")}.
              </p>
              <p className="text-sm font-semibold text-foreground">
                Total: <span className="text-primary">{formatGb(report.totalGb)} GB</span>
              </p>
            </div>

            {report.warnings.length > 0 && (
              <div className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-[12px] text-warning">
                {report.warnings[0]}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: typeof Sparkles; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}

function CleanRow({ item, totalBytes }: { item: CleanScanItem; totalBytes: number }) {
  const percent = totalBytes > 0 ? Math.max(4, Math.round((item.estimatedBytes / totalBytes) * 100)) : 0;
  const Icon = getIcon(item.id);

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="text-[12px] text-muted-foreground truncate">{item.description}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary">{formatGb(item.estimatedGb)} GB</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      {item.paths.length > 0 && (
        <p className="mt-2 truncate text-[11px] text-muted-foreground" title={item.paths.join(" | ")}>
          {item.paths[0]}
        </p>
      )}
    </div>
  );
}

function getIcon(id: string) {
  if (id === "logs") {
    return FileText;
  }

  if (id === "cache" || id === "windows-update-cache") {
    return Database;
  }

  if (id === "thumbnails") {
    return FolderOpen;
  }

  return Trash2;
}

function formatGb(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 1 ? 1 : 0,
  }).format(value);
}
