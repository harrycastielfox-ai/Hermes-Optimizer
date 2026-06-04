import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { BenchmarkPage } from "../features/benchmark/BenchmarkPage";
import { CleanerPage } from "../features/cleaner/CleanerPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { DiagnosticsPage } from "../features/diagnostics/DiagnosticsPage";
import { GamerPage } from "../features/gamer/GamerPage";
import { HistoryPage } from "../features/history/HistoryPage";
import { LogsPage } from "../features/logs/LogsPage";
import { ProfilesPage } from "../features/profiles/ProfilesPage";
import { RestorePage } from "../features/restore/RestorePage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { StartupPage } from "../features/startup/StartupPage";
import { TweaksPage } from "../features/tweaks/TweaksPage";
import { useUxMode } from "./UxModeContext";

function AdvancedOnly({ children }: { children: ReactElement }) {
  const { advancedMode } = useUxMode();
  return advancedMode ? children : <Navigate to="/" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/modo-gamer" element={<GamerPage />} />
      <Route path="/restauracao" element={<RestorePage />} />
      <Route path="/diagnostico" element={<AdvancedOnly><DiagnosticsPage /></AdvancedOnly>} />
      <Route path="/benchmark" element={<AdvancedOnly><BenchmarkPage /></AdvancedOnly>} />
      <Route path="/limpeza" element={<AdvancedOnly><CleanerPage /></AdvancedOnly>} />
      <Route path="/inicializacao" element={<AdvancedOnly><StartupPage /></AdvancedOnly>} />
      <Route path="/otimizacoes" element={<AdvancedOnly><TweaksPage /></AdvancedOnly>} />
      <Route path="/perfis" element={<AdvancedOnly><ProfilesPage /></AdvancedOnly>} />
      <Route path="/historico" element={<AdvancedOnly><HistoryPage /></AdvancedOnly>} />
      <Route path="/logs" element={<AdvancedOnly><LogsPage /></AdvancedOnly>} />
      <Route path="/configuracoes" element={<AdvancedOnly><SettingsPage /></AdvancedOnly>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
