import { Route, Routes } from "react-router-dom";
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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/diagnostico" element={<DiagnosticsPage />} />
      <Route path="/benchmark" element={<BenchmarkPage />} />
      <Route path="/limpeza" element={<CleanerPage />} />
      <Route path="/inicializacao" element={<StartupPage />} />
      <Route path="/otimizacoes" element={<TweaksPage />} />
      <Route path="/modo-gamer" element={<GamerPage />} />
      <Route path="/perfis" element={<ProfilesPage />} />
      <Route path="/restauracao" element={<RestorePage />} />
      <Route path="/historico" element={<HistoryPage />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/configuracoes" element={<SettingsPage />} />
    </Routes>
  );
}
