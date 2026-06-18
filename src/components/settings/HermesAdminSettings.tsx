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
} from "lucide-react";
import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useHermesPreferences, type UpdateChannel } from "@/lib/preferences";

export function HermesAdminSettings() {
  const { preferences, loaded, language, updatePreferences, resetPreferences, t } =
    useHermesPreferences();
  const [notice, setNotice] = useState<string | null>(null);

  function savePreference(updater: Parameters<typeof updatePreferences>[0]) {
    updatePreferences(updater);
    setNotice(t("settings.notice.saved"));
  }

  function handleResetPreferences() {
    const confirmed = window.confirm(t("settings.confirmReset"));
    if (!confirmed) {
      return;
    }

    resetPreferences();
    setNotice(t("settings.notice.reset"));
  }

  const storageText = useMemo(() => {
    if (!loaded || preferences.updatedAt === "0") {
      return t("settings.waiting");
    }

    return `${t("settings.saved")} ${formatDate(preferences.updatedAt, language)}`;
  }, [language, loaded, preferences.updatedAt, t]);

  return (
    <section
      id="configuracoes-completas"
      className="scroll-mt-5 mt-5 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_34px_-20px_rgba(15,23,42,0.16)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <MonitorCog className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.22em] text-primary">
              {t("settings.admin.eyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{t("settings.admin.title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {t("settings.admin.description")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetPreferences}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-muted"
        >
          <RefreshCcw className="h-4 w-4 text-primary" />
          {t("settings.reset")}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("settings.localOnly")}</span>
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
          title={t("settings.updates.title")}
          description={t("settings.updates.description")}
        >
          <ToggleRow
            icon={CheckCircle2}
            title={t("settings.updates.autoCheck.title")}
            description={t("settings.updates.autoCheck.description")}
            checked={preferences.updates.autoCheck}
            onCheckedChange={(checked) =>
              savePreference((current) => ({
                ...current,
                updates: { ...current.updates, autoCheck: checked },
              }))
            }
          />
          <ToggleRow
            icon={Download}
            title={t("settings.updates.autoDownload.title")}
            description={t("settings.updates.autoDownload.description")}
            checked={preferences.updates.autoDownload}
            onCheckedChange={(checked) =>
              savePreference((current) => ({
                ...current,
                updates: { ...current.updates, autoDownload: checked },
              }))
            }
          />
          <SegmentedControl
            label={t("settings.updates.channel")}
            value={preferences.updates.channel}
            options={[
              {
                value: "stable",
                label: t("settings.option.stable"),
                description: t("settings.option.recommended"),
              },
              {
                value: "beta",
                label: t("settings.option.beta"),
                description: t("settings.option.future"),
              },
            ]}
            onChange={(channel) =>
              savePreference((current) => ({
                ...current,
                updates: { ...current.updates, channel },
              }))
            }
          />
          <ToggleRow
            icon={FileKey2}
            title={t("settings.updates.history.title")}
            description={t("settings.updates.history.description")}
            checked={preferences.updates.versionHistory}
            onCheckedChange={(checked) =>
              savePreference((current) => ({
                ...current,
                updates: { ...current.updates, versionHistory: checked },
              }))
            }
          />
        </SettingsPanel>

        <SettingsPanel
          icon={Palette}
          title={t("settings.appearance.title")}
          description={t("settings.appearance.description")}
        >
          <SegmentedControl
            label={t("settings.appearance.theme")}
            value={preferences.appearance.theme}
            options={[
              {
                value: "light",
                label: t("settings.option.light"),
                description:
                  preferences.appearance.theme === "light"
                    ? t("settings.option.active")
                    : t("settings.option.current"),
              },
              {
                value: "dark",
                label: t("settings.option.dark"),
                description:
                  preferences.appearance.theme === "dark"
                    ? t("settings.option.active")
                    : t("settings.option.current"),
              },
              {
                value: "system",
                label: t("settings.option.system"),
                description:
                  preferences.appearance.theme === "system"
                    ? t("settings.option.active")
                    : t("settings.option.current"),
              },
            ]}
            onChange={(theme) =>
              savePreference((current) => ({
                ...current,
                appearance: { ...current.appearance, theme },
              }))
            }
          />
          <SegmentedControl
            label={t("settings.appearance.accent")}
            value={preferences.appearance.accent}
            options={[
              {
                value: "blue",
                label: t("settings.option.blue"),
                description:
                  preferences.appearance.accent === "blue"
                    ? t("settings.option.active")
                    : t("settings.option.current"),
              },
              {
                value: "gold",
                label: t("settings.option.gold"),
                description:
                  preferences.appearance.accent === "gold"
                    ? t("settings.option.active")
                    : t("settings.option.current"),
              },
              {
                value: "auto",
                label: t("settings.option.auto"),
                description: t("settings.option.future"),
              },
            ]}
            onChange={(accent) =>
              savePreference((current) => ({
                ...current,
                appearance: { ...current.appearance, accent },
              }))
            }
          />
          <ReadonlyNote
            icon={Eye}
            title={t("settings.appearance.note.title")}
            text={t("settings.appearance.note.text")}
          />
        </SettingsPanel>

        <SettingsPanel
          icon={Bell}
          title={t("settings.notifications.title")}
          description={t("settings.notifications.description")}
        >
          <ToggleRow
            icon={Bell}
            title={t("settings.notifications.system.title")}
            description={t("settings.notifications.system.description")}
            checked={preferences.notifications.system}
            onCheckedChange={(checked) =>
              savePreference((current) => ({
                ...current,
                notifications: { ...current.notifications, system: checked },
              }))
            }
          />
          <ToggleRow
            icon={CheckCircle2}
            title={t("settings.notifications.cleanup.title")}
            description={t("settings.notifications.cleanup.description")}
            checked={preferences.notifications.cleanupDone}
            onCheckedChange={(checked) =>
              savePreference((current) => ({
                ...current,
                notifications: { ...current.notifications, cleanupDone: checked },
              }))
            }
          />
          <ToggleRow
            icon={MonitorCog}
            title={t("settings.notifications.performance.title")}
            description={t("settings.notifications.performance.description")}
            checked={preferences.notifications.performanceAlerts}
            onCheckedChange={(checked) =>
              savePreference((current) => ({
                ...current,
                notifications: { ...current.notifications, performanceAlerts: checked },
              }))
            }
          />
        </SettingsPanel>

        <SettingsPanel
          icon={Globe2}
          title={t("settings.language.title")}
          description={t("settings.language.description")}
        >
          <SegmentedControl
            label={t("settings.language.interface")}
            value={preferences.language.current}
            options={[
              {
                value: "pt-BR",
                label: t("settings.option.portuguese"),
                description:
                  preferences.language.current === "pt-BR"
                    ? t("settings.option.active")
                    : t("settings.option.current"),
              },
              {
                value: "en-US",
                label: t("settings.option.english"),
                description:
                  preferences.language.current === "en-US"
                    ? t("settings.option.active")
                    : t("settings.option.current"),
              },
              {
                value: "es-ES",
                label: t("settings.option.spanish"),
                description:
                  preferences.language.current === "es-ES"
                    ? t("settings.option.active")
                    : t("settings.option.current"),
              },
            ]}
            onChange={(language) =>
              savePreference((current) => ({
                ...current,
                language: { ...current.language, current: language },
              }))
            }
          />
          <ReadonlyNote
            icon={Info}
            title={t("settings.language.note.title")}
            text={t("settings.language.note.text")}
          />
        </SettingsPanel>

        <SettingsPanel
          icon={FileKey2}
          title={t("settings.license.title")}
          description={t("settings.license.description")}
        >
          <InfoGrid
            items={[
              { label: t("settings.license.version"), value: "0.x" },
              {
                label: t("settings.license.channel"),
                value: channelLabel(preferences.updates.channel, t),
              },
              { label: t("settings.license.status"), value: t("settings.license.devMode") },
              {
                label: t("settings.license.activation"),
                value: t("settings.license.notImplemented"),
              },
            ]}
          />
          <ReadonlyNote
            icon={LockKeyhole}
            title={t("settings.license.note.title")}
            text={t("settings.license.note.text")}
          />
        </SettingsPanel>

        <SettingsPanel
          icon={LockKeyhole}
          title={t("settings.privacy.title")}
          description={t("settings.privacy.description")}
        >
          <PrivacyPromise text={t("settings.privacy.local")} />
          <PrivacyPromise text={t("settings.privacy.noTelemetry")} />
          <PrivacyPromise text={t("settings.privacy.noUpload")} />
          <PrivacyPromise text={t("settings.privacy.noCloud")} />
          <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {t("settings.privacy.share.title")}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {t("settings.privacy.share.description")}
                </p>
              </div>
              <Switch
                checked={preferences.privacy.anonymousSharing}
                disabled
                aria-label={t("settings.privacy.share.title")}
              />
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
                  ? "border-primary bg-primary/10 text-primary shadow-lg"
                  : "border-border/70 bg-background/70 text-foreground hover:border-primary/35"
              }`}
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReadonlyNote({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
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

function channelLabel(
  channel: UpdateChannel,
  t: (key: "settings.option.beta" | "settings.option.future" | "settings.option.stable") => string,
) {
  if (channel === "beta") {
    return `${t("settings.option.beta")} ${t("settings.option.future")}`;
  }

  return t("settings.option.stable");
}

function formatDate(value: string, language: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "localmente";
  }

  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
