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
export type LanguagePreference = "pt-BR" | "en-US" | "es-ES" | "ja-JP";

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
  | "sidebar.optimize"
  | "sidebar.diagnostic"
  | "sidebar.antiCheat"
  | "sidebar.defender"
  | "sidebar.recommendations"
  | "sidebar.prepare"
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
  | "settings.option.spanish"
  | "settings.option.japanese";

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
const supportedLanguages = new Set<LanguagePreference>(["pt-BR", "en-US", "es-ES", "ja-JP"]);

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

const translations: Record<LanguagePreference, Partial<Record<TranslationKey, string>>> = {
  "pt-BR": {
    "sidebar.dashboard": "Dashboard",
    "sidebar.optimize": "Otimizar",
    "sidebar.diagnostic": "Diagnóstico",
    "sidebar.antiCheat": "Anti-Cheat",
    "sidebar.defender": "Defender",
    "sidebar.recommendations": "Recomendações",
    "sidebar.prepare": "Preparar Ambiente",
    "sidebar.central": "Central de Otimização",
    "sidebar.startup": "Inicialização",
    "sidebar.clean": "Limpeza",
    "sidebar.security": "Segurança",
    "sidebar.repair": "Reparar Windows",
    "sidebar.scheduler": "Manutenção Programada",
    "sidebar.custom": "Personalizado",
    "sidebar.settings": "Configurações",
    "settings.eyebrow": "CONFIGURACOES",
    "settings.title": "Configurações",
    "settings.subtitle":
      "Preferencias do aplicativo. Modulos operacionais ficam nas abas dedicadas da sidebar.",
    "settings.placeholder.loading": "Carregando preferencias locais...",
    "settings.placeholder.waiting": "Modulo aguardando abertura da secao.",
    "settings.admin.eyebrow": "ADMINISTRACAO",
    "settings.admin.title": "Configurações completas",
    "settings.admin.description":
      "Preferencias locais para atualizações futuras, aparência, notificações, idioma, licença e privacidade.",
    "settings.reset": "Restaurar padrão",
    "settings.localOnly":
      "Preferencias salvas apenas neste dispositivo. Sem conta, sem nuvem e sem telemetria.",
    "settings.saved": "Salvo em",
    "settings.waiting": "Aguardando leitura local.",
    "settings.notice.saved": "Preferencias salvas localmente.",
    "settings.notice.reset": "Preferencias locais restauradas para o padrão.",
    "settings.confirmReset":
      "Restaurar preferencias visuais e administrativas padrão? Nenhuma engine será alterada.",
    "settings.updates.title": "Atualizações",
    "settings.updates.description":
      "Estrutura visual para verificacao, download automático e canais futuros. Nenhuma atualização real e executada.",
    "settings.updates.autoCheck.title": "Verificar atualizações automaticamente",
    "settings.updates.autoCheck.description": "Preparado para fase futura de updates locais.",
    "settings.updates.autoDownload.title": "Baixar atualizações automaticamente",
    "settings.updates.autoDownload.description":
      "Preferencia salva, sem downloader implementado nesta fase.",
    "settings.updates.channel": "Canal",
    "settings.updates.history.title": "Histórico de versoes",
    "settings.updates.history.description": "Area preparada para changelog local futuro.",
    "settings.appearance.title": "Aparência",
    "settings.appearance.description":
      "Tema global funcional sem alterar engines ou configurações do Windows.",
    "settings.appearance.theme": "Tema",
    "settings.appearance.accent": "Cor principal",
    "settings.appearance.note.title": "Tema aplicado localmente",
    "settings.appearance.note.text":
      "O Hermes muda apenas a aparência do app. Tema do Windows e navegadores nunca sao alterados.",
    "settings.notifications.title": "Notificações",
    "settings.notifications.description":
      "Preferencias locais para avisos futuros. Nenhum servico residente e criado.",
    "settings.notifications.system.title": "Notificações do sistema",
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
      "Nesta etapa, Configurações e a navegação principal já respondem ao idioma escolhido.",
    "settings.license.title": "Licença",
    "settings.license.description":
      "Area comercial preparada sem ativacao, servidor, pagamento ou validação real.",
    "settings.license.version": "Versao atual",
    "settings.license.channel": "Canal atual",
    "settings.license.status": "Status da licença",
    "settings.license.activation": "Ativacao",
    "settings.license.devMode": "Congelada para esta release",
    "settings.license.notImplemented": "Ativacao indisponível",
    "settings.license.note.title": "Sem licenciamento real",
    "settings.license.note.text":
      "Licenciamento real esta congelado nesta release: nenhuma chave e validada, nenhum servidor e chamado e nenhum pagamento e integrado.",
    "settings.privacy.title": "Privacidade",
    "settings.privacy.description":
      "Compromissos locais do Hermes e base visual para preferencias futuras.",
    "settings.privacy.local": "Hermes funciona localmente.",
    "settings.privacy.noTelemetry": "Sem telemetria obrigatória.",
    "settings.privacy.noUpload": "Sem envio automático de dados.",
    "settings.privacy.noCloud": "Sem nuvem obrigatória, conta ou login.",
    "settings.privacy.share.title": "Compartilhar dados anonimos",
    "settings.privacy.share.description":
      "Opção futura. Desativada por padrão e sem qualquer coleta nesta fase.",
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
    "settings.option.auto": "Automático",
    "settings.option.portuguese": "Portugues",
    "settings.option.english": "English",
    "settings.option.spanish": "Espanol",
    "settings.option.japanese": "Japones",
  },
  "en-US": {
    "sidebar.dashboard": "Dashboard",
    "sidebar.optimize": "Optimize",
    "sidebar.diagnostic": "Diagnostics",
    "sidebar.antiCheat": "Anti-Cheat",
    "sidebar.defender": "Defender",
    "sidebar.recommendations": "Recommendations",
    "sidebar.prepare": "Prepare Environment",
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
    "settings.license.devMode": "Frozen for this release",
    "settings.license.notImplemented": "Activation unavailable",
    "settings.license.note.title": "No real licensing",
    "settings.license.note.text":
      "Real licensing is frozen for this release: no key is validated, no server is called, and no payment is integrated.",
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
    "settings.option.japanese": "Japanese",
  },
  "es-ES": {
    "sidebar.dashboard": "Dashboard",
    "sidebar.optimize": "Optimizar",
    "sidebar.diagnostic": "Diagnóstico",
    "sidebar.antiCheat": "Anti-Cheat",
    "sidebar.defender": "Defender",
    "sidebar.recommendations": "Recomendaciones",
    "sidebar.prepare": "Preparar Ambiente",
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
      "Restaurar preferencias visuales y administrativas al predeterminado? Ningun motor será alterado.",
    "settings.updates.title": "Actualizaciones",
    "settings.updates.description":
      "Estructura visual para verificacion, descarga automática y canales futuros. No se ejecuta ninguna actualizacion real.",
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
    "settings.license.devMode": "Congelada para esta release",
    "settings.license.notImplemented": "Activacion no disponible",
    "settings.license.note.title": "Sin licencia real",
    "settings.license.note.text":
      "La licencia real esta congelada en esta release: no se valida clave, no se llama servidor y no se integra pago.",
    "settings.privacy.title": "Privacidad",
    "settings.privacy.description":
      "Compromisos locales de Hermes y base visual para preferencias futuras.",
    "settings.privacy.local": "Hermes funciona localmente.",
    "settings.privacy.noTelemetry": "Sin telemetria obligatoria.",
    "settings.privacy.noUpload": "Sin envio automático de datos.",
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
    "settings.option.auto": "Automático",
    "settings.option.portuguese": "Portugues",
    "settings.option.english": "English",
    "settings.option.spanish": "Espanol",
    "settings.option.japanese": "Japones",
  },
  "ja-JP": {
    "sidebar.dashboard": "ダッシュボード",
    "sidebar.optimize": "最適化",
    "sidebar.diagnostic": "診断",
    "sidebar.antiCheat": "アンチチート",
    "sidebar.defender": "Defender",
    "sidebar.recommendations": "推奨",
    "sidebar.prepare": "環境準備",
    "sidebar.central": "最適化センター",
    "sidebar.startup": "スタートアップ",
    "sidebar.clean": "クリーンアップ",
    "sidebar.security": "セキュリティ",
    "sidebar.repair": "Windows修復",
    "sidebar.scheduler": "定期メンテナンス",
    "sidebar.custom": "カスタム",
    "sidebar.settings": "設定",
    "settings.eyebrow": "設定",
    "settings.title": "設定",
    "settings.subtitle": "アプリの設定です。実行モジュールはサイドバーの専用エリアにあります。",
    "settings.placeholder.loading": "ローカル設定を読み込み中...",
    "settings.placeholder.waiting": "このセクションを開くまで待機中です。",
    "settings.admin.eyebrow": "管理",
    "settings.admin.title": "詳細設定",
    "settings.admin.description":
      "今後の更新、外観、通知、言語、ライセンス、プライバシーのローカル設定。",
    "settings.reset": "標準に戻す",
    "settings.localOnly":
      "設定はこのデバイスだけに保存されます。アカウント、クラウド、テレメトリはありません。",
    "settings.saved": "保存日時",
    "settings.waiting": "ローカル読み込みを待機中です。",
    "settings.notice.saved": "設定をローカルに保存しました。",
    "settings.notice.reset": "ローカル設定を標準に戻しました。",
    "settings.confirmReset": "外観と管理設定を標準に戻しますか？エンジン設定は変更されません。",
    "settings.updates.title": "更新",
    "settings.updates.description":
      "確認、自動ダウンロード、今後のチャンネル用の表示構造です。実際の更新は実行されません。",
    "settings.updates.autoCheck.title": "更新を自動で確認",
    "settings.updates.autoCheck.description": "今後のローカル更新フェーズ用に準備済みです。",
    "settings.updates.autoDownload.title": "更新を自動でダウンロード",
    "settings.updates.autoDownload.description":
      "設定は保存されますが、この段階ではダウンローダーは未実装です。",
    "settings.updates.channel": "チャンネル",
    "settings.updates.history.title": "バージョン履歴",
    "settings.updates.history.description": "今後のローカル変更履歴用エリアです。",
    "settings.appearance.title": "外観",
    "settings.appearance.description":
      "エンジンやWindows設定を変更しない、アプリ内だけのテーマ設定です。",
    "settings.appearance.theme": "テーマ",
    "settings.appearance.accent": "メインカラー",
    "settings.appearance.note.title": "テーマはローカル適用",
    "settings.appearance.note.text":
      "Hermesはアプリの外観だけを変更します。Windowsやブラウザのテーマは変更しません。",
    "settings.notifications.title": "通知",
    "settings.notifications.description":
      "今後の通知用ローカル設定です。常駐サービスは作成されません。",
    "settings.notifications.system.title": "システム通知",
    "settings.notifications.system.description": "必要な時だけ表示するローカル通知用です。",
    "settings.notifications.cleanup.title": "クリーンアップ完了",
    "settings.notifications.cleanup.description": "Clean Engineの結果通知用に準備済みです。",
    "settings.notifications.performance.title": "パフォーマンス警告",
    "settings.notifications.performance.description":
      "常時監視なしで、今後の読み取り結果に対応するための設定です。",
    "settings.language.title": "言語",
    "settings.language.description":
      "インターフェースのローカル言語です。主要テキストはインターネットなしで更新されます。",
    "settings.language.interface": "インターフェース言語",
    "settings.language.note.title": "言語はローカル適用",
    "settings.language.note.text":
      "この段階では、設定画面とメインナビゲーションが選択した言語に対応します。",
    "settings.license.title": "ライセンス",
    "settings.license.description":
      "有効化、サーバー、支払い、実検証なしで準備された商用エリアです。",
    "settings.license.version": "現在のバージョン",
    "settings.license.channel": "現在のチャンネル",
    "settings.license.status": "ライセンス状態",
    "settings.license.activation": "有効化",
    "settings.license.devMode": "このリリースでは凍結",
    "settings.license.notImplemented": "有効化は未対応",
    "settings.license.note.title": "実ライセンスなし",
    "settings.license.note.text":
      "このリリースでは実ライセンスを凍結しています。キー検証、サーバー呼び出し、支払い連携はありません。",
    "settings.privacy.title": "プライバシー",
    "settings.privacy.description": "Hermesのローカル方針と今後のプライバシー設定のベースです。",
    "settings.privacy.local": "Hermesはローカルで動作します。",
    "settings.privacy.noTelemetry": "必須テレメトリなし。",
    "settings.privacy.noUpload": "データの自動送信なし。",
    "settings.privacy.noCloud": "必須クラウド、アカウント、ログインなし。",
    "settings.privacy.share.title": "匿名データを共有",
    "settings.privacy.share.description":
      "今後のオプションです。標準では無効で、この段階では収集はありません。",
    "settings.option.light": "ライト",
    "settings.option.dark": "ダーク",
    "settings.option.system": "システム",
    "settings.option.current": "現在",
    "settings.option.active": "有効",
    "settings.option.stable": "安定版",
    "settings.option.recommended": "推奨",
    "settings.option.beta": "ベータ",
    "settings.option.future": "今後対応",
    "settings.option.blue": "Hermesブルー",
    "settings.option.gold": "ゴールド",
    "settings.option.auto": "自動",
    "settings.option.portuguese": "ポルトガル語",
    "settings.option.english": "英語",
    "settings.option.spanish": "スペイン語",
    "settings.option.japanese": "日本語",
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
      translations[preferences.language.current]?.[key] ?? translations["pt-BR"][key] ?? key,
    [preferences.language],
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
      current: normalizeLanguage(value.language?.current),
    },
    privacy: {
      anonymousSharing: false,
    },
    updatedAt: value.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeLanguage(value: unknown): LanguagePreference {
  return typeof value === "string" && supportedLanguages.has(value as LanguagePreference)
    ? (value as LanguagePreference)
    : defaultPreferences.language.current;
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
