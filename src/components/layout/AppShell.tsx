import type { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-72 min-h-screen p-8">{children}</main>
    </div>
  );
}
