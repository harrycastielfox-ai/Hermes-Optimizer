import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

type UxModeContextValue = {
  advancedMode: boolean;
  enterAdvancedMode: () => void;
  exitAdvancedMode: () => void;
};

const UxModeContext = createContext<UxModeContextValue | undefined>(undefined);

export function UxModeProvider({ children }: PropsWithChildren) {
  const [advancedMode, setAdvancedMode] = useState(true);

  const value = useMemo(
    () => ({
      advancedMode,
      enterAdvancedMode: () => setAdvancedMode(true),
      exitAdvancedMode: () => setAdvancedMode(true),
    }),
    [advancedMode],
  );

  return <UxModeContext.Provider value={value}>{children}</UxModeContext.Provider>;
}

export function useUxMode() {
  const context = useContext(UxModeContext);
  if (!context) {
    throw new Error("useUxMode must be used inside UxModeProvider");
  }
  return context;
}
