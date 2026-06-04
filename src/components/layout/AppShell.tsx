import type { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="hermes-app min-h-screen text-slate-950">
      <Sidebar />
      <main className="ml-80 min-h-screen px-10 py-8 transition-all duration-300">
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}
