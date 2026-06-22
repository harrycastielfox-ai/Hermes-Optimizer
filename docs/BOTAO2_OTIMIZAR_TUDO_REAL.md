# Botao 2 - Otimizar Tudo em modo real

Este documento descreve o contrato do Botao 2 depois que a Fase 1 ja foi concluida.

## Regra de execucao

- Build teste: `HERMES_SAFE_TEST_MODE=true` e `VITE_HERMES_SAFE_TEST_MODE=true`.
- Build real: `HERMES_SAFE_TEST_MODE=false` e `VITE_HERMES_SAFE_TEST_MODE=false`.
- O Botao 2 nao deve manter `dryRun: true` fixo em caminhos de aplicacao.
- Em build real, as fases enviam `confirmed: true` e `dryRun: false` para as engines.
- O backend Rust continua sendo a trava final: se o modo seguro estiver ativo, ele forca dry-run.

## Fases do Botao 2

- Plano inteligente: orquestrador local, Hermes IA e diagnostico.
- Permissoes: confirma o modo atual e registra logs locais.
- Componentes: VC++/DirectX verificados, DirectPlay, NetFx3 e DISM allowlistado.
- Limpeza: Clean Engine com itens seguros.
- Inicializacao: Startup Engine para itens controlaveis de alto impacto.
- Performance: energia, Game Mode, GameDVR e visual controlado.
- Gamer: jogo alvo, Fate Trigger/UE5, Discord/Steam protegidos e processos seguros.
- Perfil: aplica o perfil recomendado quando liberado.
- Avancado guiado: comandos allowlistados, sem alto risco/extremo automatico.

## Resultado esperado

- Em modo teste, o relatorio usa termos como validado/simulado.
- Em modo real, o relatorio usa aplicado/fechado/instalado quando a engine realmente executa.
- Acoes inexistentes ou bloqueadas continuam como indisponiveis, nunca como aplicadas.
- Ao final, o Hermes recomenda reinicio final.
