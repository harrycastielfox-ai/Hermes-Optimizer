import type { RiskLevel } from "../types";

export function formatMb(value: number) {
  if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
  return `${value.toFixed(0)} MB`;
}

export function riskLabel(risk: RiskLevel) {
  return risk === "low" ? "Baixo" : risk === "medium" ? "Médio" : "Alto";
}
