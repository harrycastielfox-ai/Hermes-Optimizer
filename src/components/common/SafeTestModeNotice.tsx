import { ShieldCheck } from "lucide-react";
import { HERMES_SAFE_TEST_MODE, HERMES_SAFE_TEST_MODE_MESSAGE } from "@/lib/safe-mode";

export function SafeTestModeNotice() {
  if (!HERMES_SAFE_TEST_MODE) {
    return null;
  }

  return (
    <div className="mb-4 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-warning">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-bold">{HERMES_SAFE_TEST_MODE_MESSAGE}</p>
          <p className="mt-1 text-[12px] leading-relaxed">
            Clean, Startup, Gamer, Perfis, Advanced, Performance e Restore aplicam somente
            DRY-RUN/BLOQUEADO nesta fase.
          </p>
        </div>
      </div>
    </div>
  );
}
