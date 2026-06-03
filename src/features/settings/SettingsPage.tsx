import { SectionCard } from "../../components/cards/SectionCard";
import { PageHeader } from "../../components/layout/PageHeader";

const settings = [
  ["Idioma", "Português (Brasil)"],
  ["Tema", "Dark premium"],
  ["Iniciar com Windows", "Desativado por padrão"],
  ["Pedir confirmação sempre", "Ativado"],
  ["Criar ponto de restauração antes de otimizações avançadas", "Ativado para ações futuras"],
  ["Modo especialista", "Desativado"],
  ["Canal de atualização futuro", "Estável"],
];

export function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Preferências" title="Configurações" description="Opções iniciais focadas em segurança, confirmação e comportamento previsível." />
      <SectionCard title="Configurações do Hermes" description="Controles visuais preparados para persistência futura.">
        <div className="grid grid-cols-2 gap-4">
          {settings.map(([name, value]) => <div key={name} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4"><p className="text-sm text-slate-400">{name}</p><p className="mt-2 font-semibold text-white">{value}</p></div>)}
        </div>
      </SectionCard>
    </>
  );
}
