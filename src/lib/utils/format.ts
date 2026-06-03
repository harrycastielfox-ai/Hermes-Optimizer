import type { RiskLevel } from "../types";

export function formatMb(value: number) {
  if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
  return `${value.toFixed(0)} MB`;
}

export function formatGb(value: number) {
  return `${value.toFixed(value >= 100 ? 0 : 1)} GB`;
}

export function formatBytesAsGb(value: number) {
  return formatGb(value / 1024 ** 3);
}

export function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function riskLabel(risk: RiskLevel) {
  return risk === "low" ? "Baixo" : risk === "medium" ? "Médio" : "Alto";
}
