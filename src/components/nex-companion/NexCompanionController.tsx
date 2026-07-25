import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import {
  NEX_COMPANION_COMMAND_EVENT,
  isTauriRuntime,
  readNexOptimizationState,
  syncNexCompanionSettings,
} from "@/lib/nex-companion";
import { useHermesPreferences } from "@/lib/preferences";
import type { NexCompanionCommand } from "@/types/nex-companion";

const EXIT_REQUEST_EVENT = "nex://exit-requested";

export function NexCompanionController() {
  const { preferences, updatePreferences } = useHermesPreferences();

  useEffect(() => {
    void syncNexCompanionSettings(preferences.companion);
  }, [preferences.companion]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const unlistenPromises = [
      listen<NexCompanionCommand>(NEX_COMPANION_COMMAND_EVENT, ({ payload }) => {
        if (payload !== "COLLAPSE_COMPANION" && payload !== "EXPAND_COMPANION") {
          return;
        }

        updatePreferences((current) => ({
          ...current,
          companion: {
            ...current.companion,
            compactMode: payload === "COLLAPSE_COMPANION",
          },
        }));
      }),
      listen(EXIT_REQUEST_EVENT, async () => {
        const optimization = readNexOptimizationState();
        if (
          optimization.isRunning &&
          !window.confirm("Uma otimização está em andamento. Deseja encerrar o NEX mesmo assim?")
        ) {
          return;
        }

        await invoke("nex_app_exit");
      }),
    ];

    return () => {
      void Promise.all(unlistenPromises).then((unlisteners) => {
        unlisteners.forEach((unlisten) => unlisten());
      });
    };
  }, [updatePreferences]);

  return null;
}
