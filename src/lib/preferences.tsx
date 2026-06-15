import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UpdateChannel = "stable" | "beta";
export type ThemePreference = "light" | "dark" | "system";
export type AccentPreference = "blue" | "gold" | "auto";
export type LanguagePreference = "pt-BR" | "en-US" | "es-ES";

export type HermesAdminPreferences = {
  version: 1;
  updates: {
    autoCheck: boolean;
    autoDownload: boolean;
    channel: UpdateChannel;
    versionHistory: boolean;
  };
  appearance: {
    theme: ThemePreference;
    accent: AccentPreference;
  };
  notifications: {
    system: boolean;
    cleanupDone: boolean;
    performanceAlerts: boolean;
  };
  language: {
    current: LanguagePreference;
  };
  privacy: {
    anonymousSharing: false;
  };
  updatedAt: string;
};

type TranslationKey =
  | "sidebar.dashboard"
  | "sidebar.diagnostic"
  | "sidebar.antiCheat"
  | "sidebar.recommendations"
  | "sidebar.central"
  | "sidebar.startup"
  | "sidebar.clean"
  | "sidebar.security"
  | "sidebar.repair"
  | "sidebar.scheduler"
  | "sidebar.custom"
  | "sidebar.settings"
  | "settings.eyebrow"
  | "settings.title"
  | "settings.subtitle"
  | "settings.placeholder.loading"
  | "settings.placeholder.waiting"
  | "settings.admin.eyebrow"
  | "settings.admin.title"
  | "settings.admin.description"
  | "settings.reset"
  | "settings.localOnly"
  | "settings.saved"
  | "settings.waiting"
  | "settings.notice.saved"
  | "settings.notice.reset"
  | "settings.confirmReset"
  | "settings.updates.title"
  | "settings.updates.description"
  | "settings.updates.autoCheck.title"
  | "settings.updates.autoCheck.description"
  | "settings.updates.autoDownload.title"
  | "settings.updates.autoDownload.description"
  | "settings.updates.channel"
  | "settings.updates.history.title"
  | "settings.updates.history.description"
  | "settings.appearance.title"
  | "settings.appearance.description"
  | "settings.appearance.theme"
  | "settings.appearance.accent"
  | "settings.appearance.note.title"
  | "settings.appearance.note.text"
  | "settings.notifications.title"
  | "settings.notifications.description"
  | "settings.notifications.system.title"
  | "settings.notifications.system.description"
  | "settings.notifications.cleanup.title"
  | "settings.notifications.cleanup.description"
  | "settings.notifications.performance.title"
  | "settings.notifications.performance.description"
  | "settings.language.title"
  | "settings.language.description"
  | "settings.language.interface"
  | "settings.language.note.title"
  | "settings.language.note.text"
  | "settings.license.title"
  | "settings.license.description"
  | "settings.license.version"
  | "settings.license.channel"
  | "settings.license.status"
  | "settings.license.activation"
  | "settings.license.devMode"
  | "settings.license.notImplemented"
  | "settings.license.note.title"
  | "settings.license.note.text"
  | "settings.privacy.title"
  | "settings.privacy.description"
  | "settings.privacy.local"
  | "settings.privacy.noTelemetry"
  | "settings.privacy.noUpload"
  | "settings.privacy.noCloud"
  | "settings.privacy.share.title"
  | "settings.privacy.share.description"
  | "settings.option.light"
  | "settings.option.dark"
  | "settings.option.system"
  | "settings.option.current"
  | "settings.option.active"
  | "settings.option.stable"
  | "settings.option.recommended"
  | "settings.option.beta"
  | "settings.option.future"
  | "settings.option.blue"
  | "settings.option.gold"
  | "settings.option.auto"
  | "settings.option.portuguese"
  | "settings.option.english"
  | "settings.option.spanish";

type HermesPreferencesContextValue = {
  preferences: HermesAdminPreferences;
  loaded: boolean;
  language: LanguagePreference;
  effectiveTheme: "light" | "dark";
  updatePreferences: (updater: (current: HermesAdminPreferences) => HermesAdminPreferences) => void;
  resetPreferences: () => void;
  t: (key: TranslationKey) => string;
};

const STORAGE_KEY = "hermes.admin.preferences.v1";
const PREFERENCES_EVENT = "hermes:preferences-updated";

export const defaultPreferences: HermesAdminPreferences = {
  version: 1,
  updates: {
    autoCheck: true,
    autoDownload: false,
    channel: "stable",
    versionHistory: true,
  },
  appearance: {
    theme: "light",
    accent: "blue",
  },
  notifications: {
    system: true,
    cleanupDone: true,
    performanceAlerts: true,
  },
  language: {
    current: "pt-BR",
  },
  privacy: {
    anonymousSharing: false,
  },
  updatedAt: "0",
};

const translations: Record<LanguagePreference, Record<TranslationKey, string>> = {
  "pt-BR": {
    "sidebar.dashboard": "Dashboard",
    "sidebar.diagnostic": "Diagnostico",
    "sidebar.antiCheat": "Anti-Cheat",
    "sidebar.recommendations": "Recomendacoes",
    "sidebar.central": "Central de Otimizacao",
    "sidebar.startup": "Inicializacao",
    "sidebar.clean": "Limpeza",
    "sidebar.security": "Seguranca",
    "sidebar.repair": "Reparar Windows",
    "sidebar.scheduler": "Manutencao Programada",
    "sidebar.custom": "Personalizado",
    "sidebar.settings": "Configuracoes",
    "settings.eyebrow": "CONFIGURACOES",
    "settings.title": "Configuracoes",
    "settings.subtitle":
      "Preferencias do aplicativo. Modulos operacionais ficam nas abas dedicadas da sidebar.",
    "settings.placeholder.loading": "Carregando preferencias locais...",
    "settings.placeholder.waiting": "Modulo aguardando abertura da secao.",
    "settings.admin.eyebrow": "ADMINISTRACAO",
    "settings.admin.title": "Configuracoes completas",
    "settings.admin.description":
      "Preferencias locais para atualizacoes futuras, aparencia, notificacoes, idioma, licenca e privacidade.",
    "settings.reset": "Restaurar padrao",
    "settings.localOnly":
      "Preferencias salvas apenas neste dispositivo. Sem conta, sem nuvem e sem telemetria.",
    "settings.saved": "Salvo em",
    "settings.waiting": "Aguardando leitura local.",
    "settings.notice.saved": "Preferencias salvas localmente.",
    "settings.notice.reset": "Preferencias locais restauradas para o padrao.",
    "settings.confirmReset":
      "Restaurar preferencias visuais e administrativas padrao? Nenhuma engine sera alterada.",
    "settings.updates.title": "Atualizacoes",
    "settings.updates.description":
      "Estrutura visual para verificacao, download automatico e canais futuros. Nenhuma atualizacao real e executada.",
    "settings.updates.autoCheck.title": "Verificar atualizacoes automaticamente",
    "settings.updates.autoCheck.description": "Preparado para fase futura de updates locais.",
    "settings.updates.autoDownload.title": "Baixar atualizacoes automaticamente",
    "settings.updates.autoDownload.description":
      "Preferencia salva, sem downloader implementado nesta fase.",
    "settings.updates.channel": "Canal",
    "settings.updates.history.title": "Historico de versoes",
    "settings.updates.history.description": "Area preparada para changelog local futuro.",
    "settings.appearance.title": "Aparencia",
    "settings.appearance.description":
      "Tema global funcional sem alterar engines ou configuracoes do Windows.",
    "settings.appearance.theme": "Tema",
    "settings.appearance.accent": "Cor principal",
    "settings.appearance.note.title": "Tema aplicado localmente",
    "settings.appearance.note.text":
      "O Hermes muda apenas a aparencia do app. Tema do Windows e navegadores nunca sao alterados.",
    "settings.notifications.title": "Notificacoes",
    "settings.notifications.description":
      "Preferencias locais para avisos futuros. Nenhum servico residente e criado.",
    "settings.notifications.system.title": "Notificacoes do sistema",
    "settings.notifications.system.description": "Preparado para avisos locais sob demanda.",
    "settings.notifications.cleanup.title": "Limpezas concluidas",
    "settings.notifications.cleanup.description": "Preparado para resultados da Clean Engine.",
    "settings.notifications.performance.title": "Alertas de desempenho",
    "settings.notifications.performance.description":
      "Preparado para leituras futuras sem monitoramento permanente.",
    "settings.language.title": "Idioma",
    "settings.language.description":
      "Idioma local da interface. O app atualiza textos principais sem internet.",
    "settings.language.interface": "Idioma da interface",
    "settings.language.note.title": "Idioma aplicado localmente",
    "settings.language.note.text":
      "Nesta etapa, Configuracoes e a navegacao principal ja respondem ao idioma escolhido.",
    "settings.license.title": "Licenca",
    "settings.license.description":
      "Area comercial preparada sem ativacao, servidor, pagamento ou validacao real.",
    "settings.license.version": "Versao atual",
    "settings.license.channel": "Canal atual",
    "settings.license.status": "Status da licenca",
    "settings.license.activation": "Ativacao",
    "settings.license.devMode": "Modo Desenvolvimento",
    "settings.license.notImplemented": "Nao implementada",
    "settings.license.note.title": "Sem licenciamento real",
    "settings.license.note.text":
      "Nenhuma chave e validada, nenhum servidor e chamado e nenhum pagamento e integrado.",
    "settings.privacy.title": "Privacidade",
    "settings.privacy.description":
      "Compromissos locais do Hermes e base visual para preferencias futuras.",
    "settings.privacy.local": "Hermes funciona localmente.",
    "settings.privacy.noTelemetry": "Sem telemetria obrigatoria.",
    "settings.privacy.noUpload": "Sem envio automatico de dados.",
    "settings.privacy.noCloud": "Sem nuvem obrigatoria, conta ou login.",
    "settings.privacy.share.title": "Compartilhar dados anonimos",
    "settings.privacy.share.description":
      "Opcao futura. Desativada por padrao e sem qualquer coleta nesta fase.",
    "settings.option.light": "Claro",
    "settings.option.dark": "Escuro",
    "settings.option.system": "Sistema",
    "settings.option.current": "Atual",
    "settings.option.active": "Ativo",
    "settings.option.stable": "Estavel",
    "settings.option.recommended": "Recomendado",
    "settings.option.beta": "Beta",
    "settings.option.future": "Futuro",
    "settings.option.blue": "Azul Hermes",
    "settings.option.gold": "Dourado",
    "settings.option.auto": "Automatico",
    "settings.option.portuguese": "Portugues",
    "settings.option.english": "English",
    "settings.option.spanish": "Espanol",
  },
  "en-US": {
    "sidebar.dashboard": "Dashboard",
    "sidebar.diagnostic": "Diagnostics",
    "sidebar.antiCheat": "Anti-Cheat",
    "sidebar.recommendations": "Recommendations",
    "sidebar.central": "Optimization Hub",
    "sidebar.startup": "Startup",
    "sidebar.clean": "Cleanup",
    "sidebar.security": "Security",
    "sidebar.repair": "Repair Windows",
    "sidebar.scheduler": "Scheduled Maintenance",
    "sidebar.custom": "Custom",
    "sidebar.settings": "Settings",
    "settings.eyebrow": "SETTINGS",
    "settings.title": "Settings",
    "settings.subtitle": "App preferences. Operational modules stay in dedicated sidebar areas.",
    "settings.placeholder.loading": "Loading local preferences...",
    "settings.placeholder.waiting": "Module waiting for this section to open.",
    "settings.admin.eyebrow": "ADMINISTRATION",
    "settings.admin.title": "Complete settings",
    "settings.admin.description":
      "Local preferences for future updates, appearance, notifications, language, license, and privacy.",
    "settings.reset": "Restore defaults",
    "settings.localOnly":
      "Preferences are saved only on this device. No account, no cloud, and no telemetry.",
    "settings.saved": "Saved at",
    "settings.waiting": "Waiting for local read.",
    "settings.notice.saved": "Preferences saved locally.",
    "settings.notice.reset": "Local preferences restored to defaults.",
    "settings.confirmReset":
      "Restore visual and administrative preferences to default? No engine will be changed.",
    "settings.updates.title": "Updates",
    "settings.updates.description":
      "Visual structure for checks, automatic download, and future channels. No real update runs.",
    "settings.updates.autoCheck.title": "Check for updates automatically",
    "settings.updates.autoCheck.description": "Prepared for a future local updates phase.",
    "settings.updates.autoDownload.title": "Download updates automatically",
    "settings.updates.autoDownload.description":
      "Preference saved, with no downloader implemented in this phase.",
    "settings.updates.channel": "Channel",
    "settings.updates.history.title": "Version history",
    "settings.updates.history.description": "Area prepared for a future local changelog.",
    "settings.appearance.title": "Appearance",
    "settings.appearance.description":
      "Functional global theme without changing engines or Windows settings.",
    "settings.appearance.theme": "Theme",
    "settings.appearance.accent": "Main color",
    "settings.appearance.note.title": "Theme applied locally",
    "settings.appearance.note.text":
      "Hermes changes only the app appearance. Windows and browser themes are never changed.",
    "settings.notifications.title": "Notifications",
    "settings.notifications.description":
      "Local preferences for future alerts. No resident service is created.",
    "settings.notifications.system.title": "System notifications",
    "settings.notifications.system.description": "Prepared for local on-demand alerts.",
    "settings.notifications.cleanup.title": "Cleanup completed",
    "settings.notifications.cleanup.description": "Prepared for Clean Engine results.",
    "settings.notifications.performance.title": "Performance alerts",
    "settings.notifications.performance.description":
      "Prepared for future readings without permanent monitoring.",
    "settings.language.title": "Language",
    "settings.language.description":
      "Local interface language. The app updates main labels without internet.",
    "settings.language.interface": "Interface language",
    "settings.language.note.title": "Language applied locally",
    "settings.language.note.text":
      "In this step, Settings and the main navigation already respond to the selected language.",
    "settings.license.title": "License",
    "settings.license.description":
      "Commercial area prepared without activation, server, payment, or real validation.",
    "settings.license.version": "Current version",
    "settings.license.channel": "Current channel",
    "settings.license.status": "License status",
    "settings.license.activation": "Activation",
    "settings.license.devMode": "Development Mode",
    "settings.license.notImplemented": "Not implemented",
    "settings.license.note.title": "No real licensing",
    "settings.license.note.text":
      "No key is validated, no server is called, and no payment is integrated.",
    "settings.privacy.title": "Privacy",
    "settings.privacy.description":
      "Hermes local commitments and a visual base for future preferences.",
    "settings.privacy.local": "Hermes runs locally.",
    "settings.privacy.noTelemetry": "No mandatory telemetry.",
    "settings.privacy.noUpload": "No automatic data upload.",
    "settings.privacy.noCloud": "No mandatory cloud, account, or login.",
    "settings.privacy.share.title": "Share anonymous data",
    "settings.privacy.share.description":
      "Future option. Disabled by default with no collection in this phase.",
    "settings.option.light": "Light",
    "settings.option.dark": "Dark",
    "settings.option.system": "System",
    "settings.option.current": "Current",
    "settings.option.active": "Active",
    "settings.option.stable": "Stable",
    "settings.option.recommended": "Recommended",
    "settings.option.beta": "Beta",
    "settings.option.future": "Future",
    "settings.option.blue": "Hermes Blue",
    "settings.option.gold": "Gold",
    "settings.option.auto": "Automatic",
    "settings.option.portuguese": "Portugues",
    "settings.option.english": "English",
    "settings.option.spanish": "Espanol",
  },
  "es-ES": {
    "sidebar.dashboard": "Dashboard",
    "sidebar.diagnostic": "Diagnostico",
    "sidebar.antiCheat": "Anti-Cheat",
    "sidebar.recommendations": "Recomendaciones",
    "sidebar.central": "Central de Optimizacion",
    "sidebar.startup": "Inicio",
    "sidebar.clean": "Limpieza",
    "sidebar.security": "Seguridad",
    "sidebar.repair": "Reparar Windows",
    "sidebar.scheduler": "Mantenimiento Programado",
    "sidebar.custom": "Personalizado",
    "sidebar.settings": "Configuracion",
    "settings.eyebrow": "CONFIGURACION",
    "settings.title": "Configuracion",
    "settings.subtitle":
      "Preferencias de la aplicacion. Los modulos operativos quedan en areas dedicadas de la barra lateral.",
    "settings.placeholder.loading": "Cargando preferencias locales...",
    "settings.placeholder.waiting": "Modulo esperando que se abra esta seccion.",
    "settings.admin.eyebrow": "ADMINISTRACION",
    "settings.admin.title": "Configuracion completa",
    "settings.admin.description":
      "Preferencias locales para futuras actualizaciones, apariencia, notificaciones, idioma, licencia y privacidad.",
    "settings.reset": "Restaurar predeterminado",
    "settings.localOnly":
      "Preferencias guardadas solo en este dispositivo. Sin cuenta, sin nube y sin telemetria.",
    "settings.saved": "Guardado en",
    "settings.waiting": "Esperando lectura local.",
    "settings.notice.saved": "Preferencias guardadas localmente.",
    "settings.notice.reset": "Preferencias locales restauradas al predeterminado.",
    "settings.confirmReset":
      "Restaurar preferencias visuales y administrativas al predeterminado? Ningun motor sera alterado.",
    "settings.updates.title": "Actualizaciones",
    "settings.updates.description":
      "Estructura visual para verificacion, descarga automatica y canales futuros. No se ejecuta ninguna actualizacion real.",
    "settings.updates.autoCheck.title": "Verificar actualizaciones automaticamente",
    "settings.updates.autoCheck.description":
      "Preparado para una fase futura de actualizaciones locales.",
    "settings.updates.autoDownload.title": "Descargar actualizaciones automaticamente",
    "settings.updates.autoDownload.description":
      "Preferencia guardada, sin descargador implementado en esta fase.",
    "settings.updates.channel": "Canal",
    "settings.updates.history.title": "Historial de versiones",
    "settings.updates.history.description": "Area preparada para changelog local futuro.",
    "settings.appearance.title": "Apariencia",
    "settings.appearance.description":
      "Tema global funcional sin alterar motores o configuraciones de Windows.",
    "settings.appearance.theme": "Tema",
    "settings.appearance.accent": "Color principal",
    "settings.appearance.note.title": "Tema aplicado localmente",
    "settings.appearance.note.text":
      "Hermes cambia solo la apariencia de la app. El tema de Windows y navegadores nunca se altera.",
    "settings.notifications.title": "Notificaciones",
    "settings.notifications.description":
      "Preferencias locales para avisos futuros. No se crea servicio residente.",
    "settings.notifications.system.title": "Notificaciones del sistema",
    "settings.notifications.system.description": "Preparado para avisos locales bajo demanda.",
    "settings.notifications.cleanup.title": "Limpiezas concluidas",
    "settings.notifications.cleanup.description": "Preparado para resultados de Clean Engine.",
    "settings.notifications.performance.title": "Alertas de rendimiento",
    "settings.notifications.performance.description":
      "Preparado para lecturas futuras sin monitoreo permanente.",
    "settings.language.title": "Idioma",
    "settings.language.description":
      "Idioma local de la interfaz. La app actualiza etiquetas principales sin internet.",
    "settings.language.interface": "Idioma de la interfaz",
    "settings.language.note.title": "Idioma aplicado localmente",
    "settings.language.note.text":
      "En esta etapa, Configuracion y la navegacion principal ya responden al idioma elegido.",
    "settings.license.title": "Licencia",
    "settings.license.description":
      "Area comercial preparada sin activacion, servidor, pago o validacion real.",
    "settings.license.version": "Version actual",
    "settings.license.channel": "Canal actual",
    "settings.license.status": "Estado de licencia",
    "settings.license.activation": "Activacion",
    "settings.license.devMode": "Modo Desarrollo",
    "settings.license.notImplemented": "No implementada",
    "settings.license.note.title": "Sin licencia real",
    "settings.license.note.text": "No se valida clave, no se llama servidor y no se integra pago.",
    "settings.privacy.title": "Privacidad",
    "settings.privacy.description":
      "Compromisos locales de Hermes y base visual para preferencias futuras.",
    "settings.privacy.local": "Hermes funciona localmente.",
    "settings.privacy.noTelemetry": "Sin telemetria obligatoria.",
    "settings.privacy.noUpload": "Sin envio automatico de datos.",
    "settings.privacy.noCloud": "Sin nube obligatoria, cuenta o login.",
    "settings.privacy.share.title": "Compartir datos anonimos",
    "settings.privacy.share.description":
      "Opcion futura. Desactivada por defecto y sin recopilacion en esta fase.",
    "settings.option.light": "Claro",
    "settings.option.dark": "Oscuro",
    "settings.option.system": "Sistema",
    "settings.option.current": "Actual",
    "settings.option.active": "Activo",
    "settings.option.stable": "Estable",
    "settings.option.recommended": "Recomendado",
    "settings.option.beta": "Beta",
    "settings.option.future": "Futuro",
    "settings.option.blue": "Azul Hermes",
    "settings.option.gold": "Dorado",
    "settings.option.auto": "Automatico",
    "settings.option.portuguese": "Portugues",
    "settings.option.english": "English",
    "settings.option.spanish": "Espanol",
  },
};

const HermesPreferencesContext = createContext<HermesPreferencesContextValue | null>(null);

export function HermesPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<HermesAdminPreferences>(() => readPreferences());
  const [loaded, setLoaded] = useState(false);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setPreferences(readPreferences());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const effectiveTheme =
    preferences.appearance.theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : preferences.appearance.theme;

  useEffect(() => {
    applyDocumentPreferences(preferences, effectiveTheme);
  }, [preferences, effectiveTheme]);

  const updatePreferences = useCallback(
    (updater: (current: HermesAdminPreferences) => HermesAdminPreferences) => {
      setPreferences((current) => {
        const next = {
          ...updater(current),
          updatedAt: new Date().toISOString(),
        };
        savePreferences(next);
        return next;
      });
    },
    [],
  );

  const resetPreferences = useCallback(() => {
    const next = {
      ...defaultPreferences,
      updatedAt: new Date().toISOString(),
    };
    savePreferences(next);
    setPreferences(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey) =>
      translations[preferences.language.current][key] ?? translations["pt-BR"][key],
    [preferences.language.current],
  );

  const value = useMemo(
    () => ({
      preferences,
      loaded,
      language: preferences.language.current,
      effectiveTheme,
      updatePreferences,
      resetPreferences,
      t,
    }),
    [effectiveTheme, loaded, preferences, resetPreferences, t, updatePreferences],
  );

  return (
    <HermesPreferencesContext.Provider value={value}>{children}</HermesPreferencesContext.Provider>
  );
}

export function useHermesPreferences() {
  const value = useContext(HermesPreferencesContext);
  if (!value) {
    throw new Error("useHermesPreferences must be used inside HermesPreferencesProvider.");
  }

  return value;
}

export function useHermesTranslation() {
  const { language, t } = useHermesPreferences();
  return { language, t };
}

export function readPreferences(): HermesAdminPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...defaultPreferences,
        updatedAt: new Date().toISOString(),
      };
    }

    const parsed = JSON.parse(raw) as Partial<HermesAdminPreferences>;
    return mergePreferences(parsed);
  } catch (error) {
    console.warn("Falha ao ler preferencias locais do Hermes.", error);
    return {
      ...defaultPreferences,
      updatedAt: new Date().toISOString(),
    };
  }
}

export function savePreferences(preferences: HermesAdminPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail: preferences }));
}

export function mergePreferences(value: Partial<HermesAdminPreferences>): HermesAdminPreferences {
  return {
    ...defaultPreferences,
    ...value,
    updates: {
      ...defaultPreferences.updates,
      ...value.updates,
    },
    appearance: {
      ...defaultPreferences.appearance,
      ...value.appearance,
    },
    notifications: {
      ...defaultPreferences.notifications,
      ...value.notifications,
    },
    language: {
      ...defaultPreferences.language,
      ...value.language,
    },
    privacy: {
      anonymousSharing: false,
    },
    updatedAt: value.updatedAt ?? new Date().toISOString(),
  };
}

function applyDocumentPreferences(
  preferences: HermesAdminPreferences,
  effectiveTheme: "light" | "dark",
) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", effectiveTheme === "dark");
  root.dataset.theme = effectiveTheme;
  root.dataset.hermesAccent = preferences.appearance.accent;
  root.lang = preferences.language.current;
}
