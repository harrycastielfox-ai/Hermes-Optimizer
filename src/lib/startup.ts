export type StartupImpact = "high" | "medium" | "low";
export type StartupStatus = "active" | "unknown";

export type StartupItem = {
  id: string;
  name: string;
  command: string;
  location: string;
  user: string;
  impact: StartupImpact;
  status: StartupStatus;
  canDisableLater: boolean;
};

export type StartupReport = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  totalItems: number;
  highImpactCount: number;
  mediumImpactCount: number;
  lowImpactCount: number;
  items: StartupItem[];
  warnings: string[];
};

export const fallbackStartupReport: StartupReport = {
  generatedAt: "0",
  engineVersion: "startup-engine-fallback-v1",
  readOnly: true,
  totalItems: 4,
  highImpactCount: 2,
  mediumImpactCount: 2,
  lowImpactCount: 0,
  items: [
    fallbackItem("Discord", "AppData\\Local\\Discord\\Update.exe --processStart Discord.exe", "high"),
    fallbackItem("Steam", "C:\\Program Files (x86)\\Steam\\steam.exe", "high"),
    fallbackItem("Spotify", "AppData\\Roaming\\Spotify\\Spotify.exe", "medium"),
    fallbackItem("OneDrive", "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe", "medium"),
  ],
  warnings: [],
};

export async function loadStartupReport(): Promise<StartupReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackStartupReport;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<StartupReport>("startup_engine_read");
  } catch (error) {
    console.warn("Startup Engine indisponivel, usando fallback local.", error);
    return fallbackStartupReport;
  }
}

function fallbackItem(name: string, command: string, impact: StartupImpact): StartupItem {
  return {
    id: `fallback-${name.toLowerCase()}`,
    name,
    command,
    location: "Startup demo somente leitura",
    user: "Usuario atual",
    impact,
    status: "active",
    canDisableLater: true,
  };
}
