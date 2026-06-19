import { Maximize2, Minus, X } from "lucide-react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

type WindowAction = "minimize" | "maximize" | "close";
type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

const resizeHandles: Array<{
  className: string;
  direction: ResizeDirection;
}> = [
  { className: "hermes-window-resize--n", direction: "North" },
  { className: "hermes-window-resize--e", direction: "East" },
  { className: "hermes-window-resize--s", direction: "South" },
  { className: "hermes-window-resize--w", direction: "West" },
  { className: "hermes-window-resize--ne", direction: "NorthEast" },
  { className: "hermes-window-resize--nw", direction: "NorthWest" },
  { className: "hermes-window-resize--se", direction: "SouthEast" },
  { className: "hermes-window-resize--sw", direction: "SouthWest" },
];

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function runWindowAction(action: WindowAction) {
  if (!isTauriRuntime()) {
    return;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();

  if (action === "minimize") {
    await appWindow.minimize();
    return;
  }

  if (action === "maximize") {
    await appWindow.toggleMaximize();
    return;
  }

  await appWindow.close();
}

async function startWindowDrag() {
  if (!isTauriRuntime()) {
    return;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().startDragging();
}

async function startWindowResize(direction: ResizeDirection) {
  if (!isTauriRuntime()) {
    return;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().startResizeDragging(direction);
}

function isDragBlocked(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("[data-no-window-drag]"));
}

export function HermesWindowChrome() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isTauriRuntime());
  }, []);

  const handleAction = useCallback((action: WindowAction) => {
    void runWindowAction(action).catch((error) => {
      console.warn("Nao foi possivel controlar a janela do Hermes.", error);
    });
  }, []);

  const handleDoubleClick = useCallback(() => {
    handleAction("maximize");
  }, [handleAction]);

  const handleDragMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.detail > 1 || isDragBlocked(event.target)) {
      return;
    }

    void startWindowDrag().catch((error) => {
      console.warn("Nao foi possivel arrastar a janela do Hermes.", error);
    });
  }, []);

  const handleResizeMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>, direction: ResizeDirection) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      void startWindowResize(direction).catch((error) => {
        console.warn("Nao foi possivel redimensionar a janela do Hermes.", error);
      });
    },
    [],
  );

  if (!enabled) {
    return null;
  }

  return (
    <>
      <div
        className="hermes-window-chrome"
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleDragMouseDown}
        aria-hidden="false"
      >
        <button
          type="button"
          className="hermes-window-control"
          data-no-window-drag
          aria-label="Minimizar Hermes"
          title="Minimizar"
          onClick={() => handleAction("minimize")}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <Minus aria-hidden="true" />
        </button>
        <button
          type="button"
          className="hermes-window-control"
          data-no-window-drag
          aria-label="Maximizar Hermes"
          title="Maximizar"
          onClick={() => handleAction("maximize")}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <Maximize2 aria-hidden="true" />
        </button>
        <button
          type="button"
          className="hermes-window-control hermes-window-control--close"
          data-no-window-drag
          aria-label="Fechar Hermes"
          title="Fechar"
          onClick={() => handleAction("close")}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      {resizeHandles.map(({ className, direction }) => (
        <div
          key={direction}
          className={`hermes-window-resize ${className}`}
          data-no-window-drag
          onMouseDown={(event) => handleResizeMouseDown(event, direction)}
        />
      ))}
    </>
  );
}
