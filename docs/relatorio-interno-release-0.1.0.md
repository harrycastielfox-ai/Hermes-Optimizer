# Relatorio Interno de Release - Hermes Optimizer 0.1.0

Data: 2026-06-26

## Decisao

**NAO PODE LANCAR como release publica final.**

O app atingiu um release candidate tecnico automatizado, mas ainda nao deve ser publicado como lancamento oficial porque o instalador de producao continua sem assinatura Authenticode, o QA manual completo em maquina limpa ainda nao foi fechado e a validacao real controlada dos Botoes 1 e 2 ainda precisa de evidencia.

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
- Dados tecnicos de execucao continuam internos para suporte/debug.
- UI principal foi simplificada para jogador: status, sucesso e proximo passo, sem relatorio tecnico na primeira camada.
- Manifesto do executavel final foi extraido e confirmou `requireAdministrator`.
- Release gates automaticos validam manifesto, safe mode, permissoes Tauri, CSP e scripts de build.

## Evidencias Automatizadas

- `npm run lint`: passou.
- `npm run build`: passou.
- `npm run build:tauri`: passou.
- `cargo test --lib`: passou com 24 testes.
- `cargo test restores_clean_quarantine_file_backup_in_real_mode`: passou e moveu um arquivo real da quarentena temporaria para destino permitido.
- `npx tauri build --debug`: passou e gerou MSI/NSIS debug.
- Script `npm run build:tauri:signed`: possui guarda obrigatoria para `HERMES_CERT_THUMBPRINT`; sem certificado, falha antes de gerar build.
- `Get-AuthenticodeSignature` nos instaladores debug: `NotSigned`, esperado enquanto nao houver certificado real.
- `npm run qa:release`: passou em 2026-06-26.
- Release gates, TypeScript, lint, build web, build Tauri frontend, Cargo check e Cargo test: passaram.
- `cargo test --lib`: 24 testes aprovados, 0 falhas.
- Catalogo de otimizacao em 2026-06-26: 150 acoes auditaveis, 150 implementadas/motoradas e 0 planejadas ou indisponiveis.
- Botao 2 recebeu lote real adicional no Advanced Engine: reducao de apps em segundo plano e notificacoes gamer, ambos com rollback/allowlist.
- Clean Engine recebeu lote real adicional: Store cache, NVIDIA shader cache, AMD shader cache, Epic launcher cache, Battle.net cache, Discord cache e OBS cache com quarentena reversivel.
- Startup Engine recebeu lote real adicional: pasta Startup, tarefas agendadas de logon/boot, OneDrive, Teams, launchers, updaters e baseline de boot.
- Advanced Engine recebeu lote real adicional de energia gamer: Ultimate Performance opcional, suspensao seletiva USB OFF e PCIe Link State OFF com allowlist de `powercfg`.
- Gamer Engine recebeu lote real adicional: revisao de overlays Steam/Xbox/GPU, excecoes OBS/BlueStacks/WSL e prioridade transiente do jogo ativo.
- Profiles Engine recebeu lote real adicional: validacao de conflitos, persistencia local do perfil recomendado e resumo interno do perfil aplicado.
- Build Windows em modo teste (`npm run build:windows:test`) passou em 2026-06-26 e gerou MSI/NSIS release com safe mode ativo.
- Instalador MSI release encontrado em `src-tauri/target/release/bundle/msi/Hermes Optimizer_0.1.0_x64_en-US.msi`.
- SHA256 MSI: `E7F45E6EAA6D3841310411DC245DED9EFE7027C2469CE1AA48A1ABC25956739D`.
- Instalador NSIS release encontrado em `src-tauri/target/release/bundle/nsis/Hermes Optimizer_0.1.0_x64-setup.exe`.
- SHA256 NSIS: `2FD08D358EC43783612D67A7664BCCD376072889F7B5826E797CF5A4A36CED77`.
- Assinatura Authenticode dos instaladores release MSI/NSIS: `NotSigned`.
- Evidencia estruturada salva em `.release/qa-latest.json`, agora com MSI/NSIS, tamanho, SHA256 e status Authenticode por instalador.
- Smoke local via Vite em 2026-06-26: Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao Programada e Configuracoes carregaram sem erro de console.
- Smoke local do Botao 1 em modo teste: Preparar PC concluiu a Fase 1, exibiu recomendacao de reinicio e liberou a Fase 2 sem aplicar mudancas reais.
- Smoke local do Botao 2 em modo teste: interacao visual ficou inconclusiva por falha do controle do navegador embutido; validar no app instalado/manual.
- `npm run verify:optimization-flow`: passou e valida Botao 1, bloqueio da Fase 2, selecao Fate Trigger, modal do Botao 2 e painel de sucesso.
- Pipeline assinado endurecido em 2026-06-26: `build:tauri:signed` delega para o build controlado, valida certificado/chave privada antes do build e valida Authenticode/mesmo thumbprint em MSI/NSIS apos o build.
- Teste negativo do build assinado sem `HERMES_CERT_THUMBPRINT`: bloqueou corretamente antes de gerar release assinada falsa.
- `npm run release:candidate`: gera pacote interno em `.release/candidates/` com MSI/NSIS, SHA256, QA, docs e decisao GO/NO-GO para teste manual em maquina limpa.
- `npm run release:candidate:verify`: valida o pacote RC antes da instalacao manual, conferindo manifesto, hashes, tamanhos, Authenticode e decisao GO/NO-GO.
- `npm run qa:manual:new`: gera sessao preenchivel de QA manual em `.release/manual-qa/`, vinculada ao release candidate mais recente.
- `npm run qa:manual:item -- -ItemId <id> -Status <status>`: atualiza um item da sessao manual com evidencia/notas e recalcula o status.
- `npm run qa:manual:status`: gera resumo da sessao manual sem bloquear por pendencias, util durante execucao do teste.
- `npm run qa:manual:verify`: gate estrito para release; falha enquanto houver P0 pendente/falhando ou instalador publico sem Authenticode `Valid`.
- `npm run release:internal`: executa a esteira interna completa, gerando QA automatizado, pacote RC, verificacao do RC e sessao/status de QA manual.

## Decisao de UX da Release

- A primeira camada da interface nao deve mostrar relatorio tecnico longo ao jogador.
- O jogador deve ver progresso, sucesso, status e proximo passo.
- Dados detalhados de execucao podem continuar salvos internamente para suporte, auditoria e debug.
- A meta de produto continua sendo poucos cliques: Preparar PC primeiro, Otimizar Tudo depois.

## Bloqueios Para GO Publico

- Build de producao assinado ainda depende de certificado real configurado em `HERMES_CERT_THUMBPRINT`.
- Instaladores MSI/NSIS release foram gerados em modo teste, mas continuam sem assinatura Authenticode.
- QA manual de instalacao e navegacao ainda precisa ser executado em maquina limpa.
- Rollback real automatizado foi validado para arquivo de quarentena; ainda falta validacao manual por fluxo completo em ambiente controlado.
- Licenciamento esta congelado, nao implementado para cobranca real nesta release.
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

