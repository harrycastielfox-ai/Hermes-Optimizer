# Relatorio Interno de Release - Hermes Optimizer 0.1.0

Data: 2026-06-24

## Decisao

**NAO PODE LANCAR como release publica final.**

O app atingiu um release candidate tecnico automatizado, mas ainda nao deve ser publicado como lancamento oficial porque o build assinado de producao, QA manual completo e validacao real do fluxo em maquina controlada ainda nao foram fechados.

## O Que Ja Esta Aprovado Tecnicamente

- Branding tecnico corrigido para Hermes Optimizer.
- Identifier Tauri saiu do default `com.tauri.dev`.
- Lint e Prettier ignoram artefatos gerados relevantes.
- Fallbacks foram zerados/rotulados como indisponiveis.
- CSP nao esta mais nula.
- Permissoes Tauri estao restritas ao capability default.
- Build Tauri desktop agora gera `build/index.html`.
- Instaladores debug foram gerados:
  - `src-tauri/target/debug/bundle/msi/Hermes Optimizer_0.1.0_x64_en-US.msi`
  - `src-tauri/target/debug/bundle/nsis/Hermes Optimizer_0.1.0_x64-setup.exe`
- Trilho de build assinado Windows preparado em `scripts/build-signed-windows.ps1`.
- MSI possui `upgradeCode` estavel para atualizacoes futuras.
- Analisar Agora foi separado das acoes de otimizacao e executa somente leitura.
- Diagnostico completo e salvo localmente e atualiza o Dashboard durante a execucao.
- Limpeza, processos Gamer, energia, registro, rede e graficos nao sao alterados pelo Analisar Agora.
- Rollback real de arquivo da quarentena validado por teste automatizado.
- Licenciamento esta congelado explicitamente para esta release.
- Botoes 1 e 2 respeitam modo teste/build real sem `dryRun: true` fixo nos fluxos principais.
- Relatorio pos-execucao separa aplicado, confirmado, nao confirmado e sem leitura.
- Manifesto do executavel final foi extraido e confirmou `requireAdministrator`.
- Release gates automaticos validam manifesto, safe mode, permissoes Tauri, CSP e scripts de build.

## Evidencias Automatizadas

- `npm run lint`: passou.
- `npm run build`: passou.
- `npm run build:tauri`: passou.
- `cargo test`: passou com 10 testes.
- `cargo test restores_clean_quarantine_file_backup_in_real_mode`: passou e moveu um arquivo real da quarentena temporaria para destino permitido.
- `npx tauri build --debug`: passou e gerou MSI/NSIS debug.
- Script `npm run build:tauri:signed`: possui guarda obrigatoria para `HERMES_CERT_THUMBPRINT`; sem certificado, falha antes de gerar build.
- `Get-AuthenticodeSignature` nos instaladores debug: `NotSigned`, esperado enquanto nao houver certificado real.
- `npm run qa:release`: passou em 2026-06-23.
- Release gates, TypeScript, lint, build web, build Tauri e Cargo check: passaram.
- `cargo test --lib`: 10 testes aprovados, 0 falhas.
- Instalador NSIS release encontrado em `src-tauri/target/release/bundle/nsis/Hermes Optimizer_0.1.0_x64-setup.exe`.
- Evidencia estruturada salva em `.release/qa-latest.json`.

## Bloqueios Para GO Publico

- Build de producao assinado ainda depende de certificado real configurado em `HERMES_CERT_THUMBPRINT`.
- Instalador NSIS release foi gerado, mas continua sem assinatura Authenticode.
- QA manual de instalacao e navegacao ainda precisa ser executado em maquina limpa.
- Rollback real automatizado foi validado para arquivo de quarentena; ainda falta validacao manual por fluxo completo em ambiente controlado.
- Licenciamento esta congelado, nao implementado.
- O build padrao continua com `HERMES_SAFE_TEST_MODE` ativo; o build real existe, mas depende de QA controlado antes da distribuicao.
- Chunk principal do build Tauri excede 500 kB; nao bloqueia sozinho, mas deve entrar em backlog de performance.

## Condicao Para Virar GO

1. Executar checklist em `docs/release-qa-checklist.md`.
2. Validar rollback real em VM ou maquina de teste descartavel.
3. Definir se o lancamento sera gratuito/sem licenca ou implementar licenciamento Hermes Account real.
4. Desativar modo seguro somente depois de QA real das allowlists.
5. Gerar build release assinado com certificado oficial.
6. Reexecutar lint, build web, build Tauri, testes Rust e instalacao limpa.

## Veredito

**NO-GO para lancamento oficial.**

**GO limitado** apenas para build interno de QA/debug, com modo seguro ativo e sem promessa comercial de otimizacao real.

