import { AppShell } from "../components/layout/AppShell";
import { UxModeProvider } from "./UxModeContext";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <UxModeProvider>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </UxModeProvider>
  );
}
