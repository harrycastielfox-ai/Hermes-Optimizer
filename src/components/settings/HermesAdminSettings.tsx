import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bell,
  CheckCircle2,
  Download,
  Eye,
  FileKey2,
  Globe2,
  Info,
  LockKeyhole,
  MonitorCog,
  Palette,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";

type UpdateChannel = "stable" | "beta";
type ThemePreference = "light" | "dark" | "system";
type AccentPreference = "blue" | "gold" | "auto";
type LanguagePreference = "pt-BR" | "en-US" | "es-ES";

type HermesAdminPreferences = {
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
    aiReports: boolean;
    cleanupDone: boolean;
    snapshotsCreated: boolean;
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

const STORAGE_KEY = "hermes.admin.preferences.v1";

const defaultPreferences: HermesAdminPreferences = {
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
    aiReports: true,
    cleanupDone: true,
    snapshotsCreated: true,
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

export function HermesAdminSettings() {
  const [preferences, setPreferences] = useState<HermesAdminPreferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setPreferences(readPreferences());
    setLoaded(true);
  }, []);

  function updatePreferences(updater: (current: HermesAdminPreferences) => HermesAdminPreferences) {
    setPreferences((current) => {
      const next = {
        ...updater(current),
        updatedAt: new Date().toISOString(),
      };
      savePreferences(next);
      setNotice("Preferencias salvas localmente.");
      return next;
    });
  }

  function resetPreferences() {
    const confirmed = window.confirm("Restaurar preferencias visuais e administrativas padrao? Nenhuma engine sera alterada.");
    if (!confirmed) {
      return;
    }

    const next = {
      ...defaultPreferences,
      updatedAt: new Date().toISOString(),
    };
    savePreferences(next);
    setPreferences(next);
    setNotice("Preferencias locais restauradas para o padrao.");
  }

  const storageText = useMemo(() => {
    if (!loaded || preferences.updatedAt === "0") {
      return "Aguardando leitura local.";
    }

    return `Salvo em ${formatDate(preferences.updatedAt)}`;
  }, [loaded, preferences.updatedAt]);

  return (
    <section className="mt-5 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_34px_-20px_rgba(15,23,42,0.16)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <MonitorCog className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.22em] text-primary">ADMINISTRACAO</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Configuracoes completas</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Preferencias locais para atualizacoes futuras, aparencia, notificacoes, idioma, licenca e privacidade.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={resetPreferences}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-muted"
        >
          <RefreshCcw className="h-4 w-4 text-primary" />
          Restaurar padrao
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Preferencias salvas apenas neste dispositivo. Sem conta, sem nuvem e sem telemetria.</span>
        </div>
        <span className="text-[12px] font-semibold">{storageText}</span>
      </div>

      {notice && (
        <div className="mt-3 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          {notice}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SettingsPanel
          icon={RefreshCcw}
          title="Atualizacoes"
          description="Estrutura visual para verificacao, download automatico e canais futuros. Nenhuma atualizacao real e executada."
        >
          <ToggleRow
            icon={CheckCircle2}
            title="Verificar atualizacoes automaticamente"
            description="Preparado para fase futura de updates locais."
            checked={preferences.updates.autoCheck}
            onCheckedChange={(checked) =>
              updatePreferences((current) => ({
                ...current,
                updates: { ...current.updates, autoCheck: checked },
              }))
            }
          />
          <ToggleRow
            icon={Download}
            title="Baixar atualizacoes automaticamente"
            description="Preferencia salva, sem downloader implementado nesta fase."
            checked={preferences.updates.autoDownload}
            onCheckedChange={(checked) =>
              updatePreferences((current) => ({
                ...current,
                updates: { ...current.updates, autoDownload: checked },
              }))
            }
          />
          <SegmentedControl
            label="Canal"
            value={preferences.updates.channel}
            options={[
              { value: "stable", label: "Estavel", description: "Recomendado" },
              { value: "beta", label: "Beta", description: "Futuro" },
            ]}
            onChange={(channel) =>
              updatePreferences((current) => ({
                ...current,
                updates: { ...current.updates, channel },
              }))
            }
          />
          <ToggleRow
            icon={FileKey2}
            title="Historico de versoes"
            description="Area preparada para changelog local futuro."
            checked={preferences.updates.versionHistory}
            onCheckedChange={(checked) =>
              updatePreferences((current) => ({
                ...current,
                updates: { ...current.updates, versionHistory: checked },
              }))
            }
          />
        </SettingsPanel>

        <SettingsPanel
          icon={Palette}
          title="Aparencia"
          description="Preferencias preparadas sem alterar a identidade visual aprovada nesta fase."
        >
          <SegmentedControl
            label="Tema"
            value={preferences.appearance.theme}
            options={[
              { value: "light", label: "Claro", description: "Atual" },
              { value: "dark", label: "Escuro", description: "Futuro" },
              { value: "system", label: "Sistema", description: "Futuro" },
            ]}
            onChange={(theme) =>
              updatePreferences((current) => ({
                ...current,
                appearance: { ...current.appearance, theme },
              }))
            }
          />
          <SegmentedControl
            label="Cor principal"
            value={preferences.appearance.accent}
            options={[
              { value: "blue", label: "Azul Hermes", description: "Atual" },
              { value: "gold", label: "Dourado", description: "Futuro" },
              { value: "auto", label: "Automatico", description: "Futuro" },
            ]}
            onChange={(accent) =>
              updatePreferences((current) => ({
                ...current,
                appearance: { ...current.appearance, accent },
              }))
            }
          />
          <ReadonlyNote
            icon={Eye}
            title="Identidade preservada"
            text="Salvar estas preferencias nao muda o tema global agora. A aplicacao continua no visual branco premium Hermes aprovado."
          />
        </SettingsPanel>

        <SettingsPanel
          icon={Bell}
          title="Notificacoes"
          description="Preferencias locais para avisos futuros. Nenhum servico residente e criado."
        >
          <ToggleRow
            icon={Bell}
            title="Notificacoes do sistema"
            description="Preparado para avisos locais sob demanda."
            checked={preferences.notifications.system}
            onCheckedChange={(checked) =>
              updatePreferences((current) => ({
                ...current,
                notifications: { ...current.notifications, system: checked },
              }))
            }
          />
          <ToggleRow
            icon={Sparkles}
            title="Relatorios Hermes AI"
            description="Avisos quando uma analise local gerar recomendacoes."
            checked={preferences.notifications.aiReports}
            onCheckedChange={(checked) =>
              updatePreferences((current) => ({
                ...current,
                notifications: { ...current.notifications, aiReports: checked },
              }))
            }
          />
          <ToggleRow
            icon={CheckCircle2}
            title="Limpezas concluidas"
            description="Preparado para resultados da Clean Engine."
            checked={preferences.notifications.cleanupDone}
            onCheckedChange={(checked) =>
              updatePreferences((current) => ({
                ...current,
                notifications: { ...current.notifications, cleanupDone: checked },
              }))
            }
          />
          <ToggleRow
            icon={ShieldCheck}
            title="Snapshots criados"
            description="Preparado para eventos do Restore Engine."
            checked={preferences.notifications.snapshotsCreated}
            onCheckedChange={(checked) =>
              updatePreferences((current) => ({
                ...current,
                notifications: { ...current.notifications, snapshotsCreated: checked },
              }))
            }
          />
          <ToggleRow
            icon={MonitorCog}
            title="Alertas de desempenho"
            description="Preparado para leituras futuras sem monitoramento permanente."
            checked={preferences.notifications.performanceAlerts}
            onCheckedChange={(checked) =>
              updatePreferences((current) => ({
                ...current,
                notifications: { ...current.notifications, performanceAlerts: checked },
              }))
            }
          />
        </SettingsPanel>

        <SettingsPanel
          icon={Globe2}
          title="Idioma"
          description="Preferencia local preparada. A traducao completa da aplicacao fica para fase futura."
        >
          <SegmentedControl
            label="Idioma da interface"
            value={preferences.language.current}
            options={[
              { value: "pt-BR", label: "Portugues", description: "Atual" },
              { value: "en-US", label: "English", description: "Futuro" },
              { value: "es-ES", label: "Espanol", description: "Futuro" },
            ]}
            onChange={(language) =>
              updatePreferences((current) => ({
                ...current,
                language: { ...current.language, current: language },
              }))
            }
          />
          <ReadonlyNote
            icon={Info}
            title="Aplicacao ainda nao traduzida"
            text="O Hermes salva a preferencia, mas nao troca textos globais nesta fase."
          />
        </SettingsPanel>

        <SettingsPanel
          icon={FileKey2}
          title="Licenca"
          description="Area comercial preparada sem ativacao, servidor, pagamento ou validacao real."
        >
          <InfoGrid
            items={[
              { label: "Versao atual", value: "0.x" },
              { label: "Canal atual", value: channelLabel(preferences.updates.channel) },
              { label: "Status da licenca", value: "Modo Desenvolvimento" },
              { label: "Ativacao", value: "Nao implementada" },
            ]}
          />
          <ReadonlyNote
            icon={LockKeyhole}
            title="Sem licenciamento real"
            text="Nenhuma chave e validada, nenhum servidor e chamado e nenhum pagamento e integrado."
          />
        </SettingsPanel>

        <SettingsPanel
          icon={ShieldCheck}
          title="Privacidade"
          description="Compromissos locais do Hermes e base visual para preferencias futuras."
        >
          <PrivacyPromise text="Hermes funciona localmente." />
          <PrivacyPromise text="Sem telemetria obrigatoria." />
          <PrivacyPromise text="Sem envio automatico de dados." />
          <PrivacyPromise text="Sem nuvem obrigatoria, conta ou login." />
          <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Compartilhar dados anonimos</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  Opcao futura. Desativada por padrao e sem qualquer coleta nesta fase.
                </p>
              </div>
              <Switch checked={preferences.privacy.anonymousSharing} disabled aria-label="Compartilhar dados anonimos desativado" />
            </div>
          </div>
        </SettingsPanel>
      </div>
    </section>
  );
}

function SettingsPanel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; description: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
      <p className="text-[11px] font-bold tracking-[0.16em] text-primary">{label}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-h-16 rounded-xl border px-3 py-2 text-left transition ${
                active
                  ? "border-primary bg-primary/10 text-primary shadow-[0_8px_22px_-18px_rgba(37,99,235,0.8)]"
                  : "border-border/70 bg-background/70 text-foreground hover:border-primary/35"
              }`}
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReadonlyNote({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function InfoGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border/70 bg-card px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-sm font-bold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function PrivacyPromise({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function readPreferences(): HermesAdminPreferences {
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

function savePreferences(preferences: HermesAdminPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

function mergePreferences(value: Partial<HermesAdminPreferences>): HermesAdminPreferences {
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

function channelLabel(channel: UpdateChannel) {
  if (channel === "beta") {
    return "Beta futuro";
  }

  return "Estavel";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "localmente";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
