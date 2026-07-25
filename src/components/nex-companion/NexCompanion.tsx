import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChevronDown, ChevronUp, EyeOff, Maximize2, Settings2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  NEX_COMPANION_SETTINGS_EVENT,
  NEX_COMPANION_STATE_EVENT,
  isTauriRuntime,
  readNexOptimizationState,
  subscribeToLocalOptimizationState,
  syncNexCompanionSettings,
} from "@/lib/nex-companion";
import { useHermesPreferences } from "@/lib/preferences";
import {
  DEFAULT_NEX_OPTIMIZATION_STATE,
  type NexCompanionSettings,
  type NexOptimizationState,
} from "@/types/nex-companion";

import { NexMascot } from "./NexMascot";
import { NexProgressRing } from "./NexProgressRing";
import "./nex-companion.css";

export function NexCompanion() {
  const { preferences, updatePreferences } = useHermesPreferences();
  const settings = preferences.companion;
  const [optimization, setOptimization] = useState<NexOptimizationState>(() =>
    readNexOptimizationState(),
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const positionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOptimization(readNexOptimizationState());
    const unsubscribeLocal = subscribeToLocalOptimizationState(setOptimization);
    if (!isTauriRuntime()) {
      return unsubscribeLocal;
    }

    const unlistenPromise = listen<NexOptimizationState>(NEX_COMPANION_STATE_EVENT, ({ payload }) =>
      setOptimization(payload),
    );

    return () => {
      unsubscribeLocal();
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    void syncNexCompanionSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const unlistenPromise = listen<NexCompanionSettings>(
      NEX_COMPANION_SETTINGS_EVENT,
      ({ payload }) => {
        updatePreferences((current) => ({
          ...current,
          companion: payload,
        }));
      },
    );

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [updatePreferences]);

  useEffect(() => {
    const updateElapsed = () => {
      if (!optimization.startedAt) {
        setElapsedSeconds(0);
        return;
      }

      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - optimization.startedAt) / 1000)));
    };

    updateElapsed();
    if (!optimization.isRunning) {
      return;
    }

    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [optimization.isRunning, optimization.startedAt]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const unlistenPromise = getCurrentWindow().onMoved(({ payload }) => {
      if (positionTimerRef.current) {
        clearTimeout(positionTimerRef.current);
      }

      positionTimerRef.current = setTimeout(() => {
        updatePreferences((current) => ({
          ...current,
          companion: {
            ...current.companion,
            position: { x: payload.x, y: payload.y },
          },
        }));
      }, 250);
    });

    return () => {
      if (positionTimerRef.current) {
        clearTimeout(positionTimerRef.current);
      }
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [updatePreferences]);

  const toggleCompact = useCallback(() => {
    updatePreferences((current) => ({
      ...current,
      companion: {
        ...current.companion,
        compactMode: !current.companion.compactMode,
      },
    }));
  }, [updatePreferences]);

  const updateCompanionSettings = useCallback(
    (patch: Partial<NexCompanionSettings>) => {
      updatePreferences((current) => ({
        ...current,
        companion: {
          ...current.companion,
          ...patch,
        },
      }));
    },
    [updatePreferences],
  );

  const startDragging = useCallback(() => {
    if (isTauriRuntime()) {
      void getCurrentWindow().startDragging();
    }
  }, []);

  const statusCopy = useMemo(() => getStatusCopy(optimization), [optimization]);
  const steps = optimization.steps.slice(0, 4);

  if (settings.compactMode) {
    return (
      <main
        className={`nex-companion nex-companion--compact nex-companion--${optimization.status}`}
        onContextMenu={(event) => {
          event.preventDefault();
          setSettingsOpen((value) => !value);
        }}
      >
        <button
          className="nex-companion__compact-body"
          type="button"
          onClick={toggleCompact}
          onMouseDown={startDragging}
          aria-label="Expandir NEX Companion"
          title="Clique para expandir. Arraste para mover."
        >
          <NexMascot status={optimization.status} compact />
          <NexProgressRing progress={optimization.progress} compact />
          <span className="nex-companion__state-dot" aria-hidden="true" />
        </button>
        {settingsOpen && (
          <CompanionSettingsMenu
            settings={settings}
            onChange={updateCompanionSettings}
            onHide={() => void invoke("nex_companion_hide")}
          />
        )}
      </main>
    );
  }

  return (
    <main
      className={`nex-companion nex-companion--expanded nex-companion--${optimization.status}`}
      onContextMenu={(event) => {
        event.preventDefault();
        setSettingsOpen((value) => !value);
      }}
    >
      <header
        className="nex-companion__header"
        onMouseDown={startDragging}
        title="Arraste para mover"
      >
        <div>
          <span>NEX COMPANION</span>
          <strong>{statusCopy.title}</strong>
        </div>
        <div
          className="nex-companion__header-actions"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={toggleCompact} title="Recolher">
            <ChevronDown size={17} />
          </button>
          <button
            type="button"
            onClick={() => void invoke("nex_companion_hide")}
            title="Ocultar Companion"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <section className="nex-companion__hero">
        <NexMascot status={optimization.status} />
        <NexProgressRing progress={optimization.progress} />
      </section>

      <section className="nex-companion__current-step" aria-live="polite">
        <span>{phaseLabel(optimization)}</span>
        <strong>{optimization.currentStep || statusCopy.fallbackStep}</strong>
        {optimization.currentDetail && <p>{optimization.currentDetail}</p>}
      </section>

      <section className="nex-companion__steps" aria-label="Etapas da otimização">
        {steps.length > 0 ? (
          steps.map((step) => (
            <div
              key={step.id}
              className={`nex-companion__step nex-companion__step--${step.status}`}
            >
              <i aria-hidden="true" />
              <div>
                <strong>{step.title}</strong>
                {step.detail && <span>{step.detail}</span>}
              </div>
            </div>
          ))
        ) : (
          <div className="nex-companion__step nex-companion__step--pending">
            <i aria-hidden="true" />
            <div>
              <strong>{statusCopy.fallbackStep}</strong>
              <span>O painel será atualizado quando a operação começar.</span>
            </div>
          </div>
        )}
      </section>

      <div className="nex-companion__elapsed">
        <span>Tempo decorrido</span>
        <strong>{formatElapsed(elapsedSeconds)}</strong>
      </div>

      <button
        className="nex-companion__open-button"
        type="button"
        onClick={() => void invoke("nex_companion_open_main")}
      >
        <Maximize2 size={17} />
        Abrir NEX
      </button>

      <footer className="nex-companion__footer">
        <button
          type="button"
          onClick={() => setSettingsOpen((value) => !value)}
          title="Configurações"
        >
          <Settings2 size={16} />
        </button>
        <span>{statusCopy.footer}</span>
        <button type="button" onClick={toggleCompact} title="Recolher">
          <ChevronUp size={16} />
        </button>
      </footer>

      {settingsOpen && (
        <CompanionSettingsMenu
          settings={settings}
          onChange={updateCompanionSettings}
          onHide={() => void invoke("nex_companion_hide")}
        />
      )}
    </main>
  );
}

function CompanionSettingsMenu({
  settings,
  onChange,
  onHide,
}: {
  settings: NexCompanionSettings;
  onChange: (patch: Partial<NexCompanionSettings>) => void;
  onHide: () => void;
}) {
  return (
    <aside className="nex-companion__menu" aria-label="Configurações rápidas do Companion">
      <strong>Companion</strong>
      <label>
        <span>Sempre visível</span>
        <input
          type="checkbox"
          checked={settings.alwaysOnTop}
          onChange={(event) => onChange({ alwaysOnTop: event.currentTarget.checked })}
        />
      </label>
      <label>
        <span>Ocultar em tela cheia</span>
        <input
          type="checkbox"
          checked={settings.hideInFullscreen}
          onChange={(event) => onChange({ hideInFullscreen: event.currentTarget.checked })}
        />
      </label>
      <label>
        <span>Atravessar cliques</span>
        <input
          type="checkbox"
          checked={settings.clickThrough}
          onChange={(event) => onChange({ clickThrough: event.currentTarget.checked })}
        />
      </label>
      <div className="nex-companion__size-options" role="group" aria-label="Tamanho">
        {(["small", "medium", "large"] as const).map((size) => (
          <button
            key={size}
            type="button"
            data-active={settings.size === size}
            onClick={() => onChange({ size })}
          >
            {size === "small" ? "P" : size === "medium" ? "M" : "G"}
          </button>
        ))}
      </div>
      <button className="nex-companion__hide-menu-button" type="button" onClick={onHide}>
        <EyeOff size={15} />
        Ocultar até eu reabrir
      </button>
    </aside>
  );
}

function getStatusCopy(state: NexOptimizationState) {
  if (state.status === "completed") {
    return {
      title: "Tudo pronto!",
      fallbackStep: "Otimização concluída",
      footer: "Operação finalizada",
    };
  }
  if (state.status === "error") {
    return {
      title: "NEX precisa de atenção",
      fallbackStep: state.errorMessage || "Abra o NEX para ver o que aconteceu",
      footer: "Ação necessária",
    };
  }
  if (state.status === "paused") {
    return {
      title: "Otimização pausada",
      fallbackStep: "Aguardando para continuar",
      footer: "Operação pausada",
    };
  }
  return {
    title: "NEX está trabalhando",
    fallbackStep: "Preparando a otimização",
    footer: "Otimização em andamento",
  };
}

function phaseLabel(state: NexOptimizationState) {
  if (state.status === "completed") return "CONCLUÍDO";
  if (state.status === "error") return "ATENÇÃO";
  if (state.phase === "prepare") return "ETAPA 1";
  if (state.phase === "optimize") return "ETAPA 2";
  return "STATUS ATUAL";
}

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function NexCompanionPreview() {
  return (
    <NexCompanionStaticState
      state={{
        ...DEFAULT_NEX_OPTIMIZATION_STATE,
        isRunning: true,
        progress: 63,
        currentStep: "Analisando disco",
        currentDetail: "Verificando integridade",
        status: "running",
      }}
    />
  );
}

function NexCompanionStaticState({ state }: { state: NexOptimizationState }) {
  return (
    <div className="nex-companion-preview" aria-hidden="true">
      <NexMascot status={state.status} />
      <NexProgressRing progress={state.progress} />
    </div>
  );
}
