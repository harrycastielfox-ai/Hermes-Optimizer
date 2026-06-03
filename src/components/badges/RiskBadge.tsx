import type { RiskLevel } from "../../lib/types";
import { riskLabel } from "../../lib/utils/format";

const riskStyles: Record<RiskLevel, string> = {
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  high: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskStyles[risk]}`}>Risco {riskLabel(risk)}</span>;
}
