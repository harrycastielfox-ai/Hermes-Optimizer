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
- Build real/teste agora possui gate dedicado para garantir frontend e backend no mesmo modo antes de gerar instalador.

## Evidencias Automatizadas

- `npm run lint`: passou.
- `npm run build`: passou.
- `npm run build:tauri`: passou.
- `cargo test --lib`: passou com 26 testes.
- `cargo test restores_clean_quarantine_file_backup_in_real_mode`: passou e moveu um arquivo real da quarentena temporaria para destino permitido.
- `npx tauri build --debug`: passou e gerou MSI/NSIS debug.
- Script `npm run build:tauri:signed`: possui guarda obrigatoria para `HERMES_CERT_THUMBPRINT`; sem certificado, falha antes de gerar build.
- `Get-AuthenticodeSignature` nos instaladores debug: `NotSigned`, esperado enquanto nao houver certificado real.
- `npm run qa:release`: passou em 2026-06-26.
- Release gates, TypeScript, lint, build web, build Tauri frontend, Cargo check e Cargo test: passaram.
- `cargo test --lib`: 26 testes aprovados, 0 falhas.
- Catalogo de otimizacao em 2026-06-28: 160 acoes auditaveis, 160 implementadas/motoradas e 0 planejadas ou indisponiveis.
- Botao 2 recebeu lote real adicional no Advanced Engine: reducao de apps em segundo plano e notificacoes gamer, ambos com rollback/allowlist.
- Clean Engine recebeu lote real adicional: Store cache, NVIDIA shader cache, AMD shader cache, Epic launcher cache, Battle.net cache, Discord cache e OBS cache com quarentena reversivel.
- Startup Engine recebeu lote real adicional: pasta Startup, tarefas agendadas de logon/boot, OneDrive, Teams, launchers, updaters e baseline de boot.
- Advanced Engine recebeu lote real adicional de energia gamer: Ultimate Performance opcional, suspensao seletiva USB OFF e PCIe Link State OFF com allowlist de `powercfg`.
- Advanced Engine recebeu lote real adicional de boot/servicos: `bcdedit /timeout 5` e servicos opcionais allowlistados sob demanda (`WerSvc`, `WMPNetworkSvc`, `Fax`, `RetailDemo`, `PhoneSvc`, `WalletService`, `XblAuthManager`, `XblGameSave`, `XboxNetApiSvc`), sem limitar CPU/RAM e sem desativar servicos Microsoft em massa.
- Gamer Engine recebeu lote real adicional: revisao de overlays Steam/Xbox/GPU, excecoes OBS/BlueStacks/WSL e prioridade transiente do jogo ativo.
- Profiles Engine recebeu lote real adicional: validacao de conflitos, persistencia local do perfil recomendado e resumo interno do perfil aplicado.
- Build Windows em modo teste (`npm run build:windows:test`) passou em 2026-06-29 e gerou MSI/NSIS release com safe mode ativo.
- Instalador MSI release encontrado em `src-tauri/target/release/bundle/msi/Hermes Optimizer_0.1.0_x64_en-US.msi`.
- SHA256 MSI: `2D52FB4FFC50C3B6746B5F4BB76AA1099AB45A711600377BAF202AB90AFCCD4D`.
- Instalador NSIS release encontrado em `src-tauri/target/release/bundle/nsis/Hermes Optimizer_0.1.0_x64-setup.exe`.
- SHA256 NSIS: `9038B82FC2FA2E59EBD0ACB3C15336F29939016A4D159F67C128738F748DE988`.
- Assinatura Authenticode dos instaladores release MSI/NSIS: `NotSigned`.
- Evidencia estruturada salva em `.release/qa-latest.json`, agora com MSI/NSIS, tamanho, SHA256 e status Authenticode por instalador.
- Smoke local via Vite em 2026-06-26: Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao Programada e Configuracoes carregaram sem erro de console.
- Smoke local do Botao 1 em modo teste: Preparar PC concluiu a Fase 1, exibiu recomendacao de reinicio e liberou a Fase 2 sem aplicar mudancas reais.
- Smoke local do Botao 2 em modo teste: interacao visual ficou inconclusiva por falha do controle do navegador embutido; validar no app instalado/manual.
- `npm run verify:optimization-flow`: passou e valida Botao 1, bloqueio da Fase 2, selecao Fate Trigger, modal do Botao 2 e painel de sucesso.
- `npm run verify:safe-mode-flow`: passou e valida Dashboard/Analise Agora como somente leitura, Botao 1/2 em dry-run e verificacao pos-execucao sem exigir mudanca real em modo teste.
- `npm run verify:build-mode`: passou e valida `build:windows:test`, `build:windows:real`, `build:windows:real:signed`, `VITE_HERMES_SAFE_TEST_MODE`, `HERMES_SAFE_TEST_MODE`, `build.rs` e `tauri.conf.json`.
- `npm run verify:branding-copy`: valida metadata Hermes, telas de erro em portugues e bloqueia residuos visiveis de starter.
- `npm run verify:ui-shell`: valida sidebar principal, rotas aprovadas, areas rolaveis e chrome customizado da janela.
- Pipeline assinado endurecido em 2026-06-26: `build:tauri:signed` delega para o build controlado, valida certificado/chave privada antes do build e valida Authenticode/mesmo thumbprint em MSI/NSIS apos o build.
- Teste negativo do build assinado sem `HERMES_CERT_THUMBPRINT`: bloqueou corretamente antes de gerar release assinada falsa.
- `npm run release:candidate`: gera pacote interno em `.release/candidates/` com MSI/NSIS, SHA256, QA, docs e decisao GO/NO-GO para teste manual em maquina limpa.
- `npm run release:candidate:verify`: valida o pacote RC antes da instalacao manual, conferindo manifesto, hashes, tamanhos, Authenticode e decisao GO/NO-GO.
- `npm run qa:manual:new`: gera sessao preenchivel de QA manual em `.release/manual-qa/`, vinculada ao release candidate mais recente.
- `npm run qa:manual:next`: mostra o proximo item pendente do QA manual e grava `.release/manual-qa/<sessao>/manual-qa-next.md` com comandos de aprovacao/falha/bloqueio.
- `npm run qa:manual:start`: prepara o alvo do item manual atual, mostrando o instalador/checklist correto e abrindo apenas quando usado com `-Launch`.
- `npm run qa:manual:sandbox`: gera `.wsb` e guia de Windows Sandbox para testar o release candidate em ambiente descartavel.
- `npm run qa:manual:install-smoke`: gera `run-install-smoke.ps1` para rodar dentro do Windows Sandbox, validar hash/tamanho/AuthentiCode, testar instalacao silenciosa NSIS/MSI e confirmar que o Hermes instalado abre processo/janela detectavel, com evidencias em JSON/Markdown.
- `npm run qa:manual:portable`: gera ZIP autocontido para VM/maquina limpa com RC, instaladores, manifesto/hash do ZIP, verificador de integridade, smoke script, checklist e guia de retorno das evidencias.
- `npm run qa:manual:drop`: gera uma pasta pronta para VM/maquina limpa com pacote QA extraido, runner unico, `.wsb`, README e comando de retorno para `qa:manual:receive`.
- `npm run qa:manual:drop:verify`: valida o drop de QA manual mais recente, conferindo ZIP, SHA256, runner, `.wsb`, README, scripts extraidos e comando de retorno.
- `npm run qa:manual:drop:open`: abre o ultimo drop no Explorer, mostra o guia e imprime comandos de VM/recebimento.
- `npm run qa:manual:drop:sandbox`: tenta abrir o `.wsb` do ultimo drop quando Windows Sandbox estiver disponivel; caso contrario, orienta uso de VM/maquina limpa.
- `npm run qa:manual:drop:zip`: compacta o ultimo drop em ZIP com SHA256 para copiar para VM/maquina limpa quando Sandbox local nao estiver disponivel.
- `npm run qa:manual:drop:auto`: executa o drop ponta a ponta no host em modo automatico seguro, regenerando o drop, zipando, validando SHA256, extraindo em pasta temporaria limpa, rodando `RODAR-QA-HERMES-NA-VM.ps1 -QuickPassAll`, copiando `HermesQA` de volta para o drop, rodando `qa:manual:drop:check` e `qa:manual:drop:receive`, com logs/relatorio em `.release/manual-qa-test-drop/results`.
- Em checkout limpo, `npm run qa:manual:drop:auto` inicializa a esteira necessaria antes do drop, gerando build Windows em modo teste e release interno quando ainda nao existe sessao de QA manual.
- `.github/workflows/qa-windows-drop.yml` roda o QA drop automatico em `windows-latest`, com triggers `workflow_dispatch`, `pull_request` e push em `main`, salvando resultados e ZIP como artifacts.
- No modo `qa:manual:drop:auto`, o runner usa `HERMES_QA_AUTO_SAFE=1` para bloquear smoke de instalacao/GUI no host e registrar a exigencia de VM/maquina descartavel para essa etapa, sem fazer alteracoes permanentes silenciosas no Windows.
- `npm run qa:manual:drop:check`: confere se o ultimo drop ja voltou da VM com `HermesQA` e evidencias antes de importar para a sessao.
- `npm run qa:manual:drop:receive`: recebe automaticamente `qa-extraido\HermesQA` do ultimo drop de QA manual e consolida a sessao com `qa:manual:receive`.
- O drop de QA manual inclui `RUN-MANUAL-QA-QUICK-PASS.ps1` para quando a VM validar todo o conjunto visual/fluxos de uma vez; ele gera evidencia dos itens nao protegidos e mantem instalacao/AuthentiCode separados.
- `npm run qa:manual:doctor`: valida o pacote portatil mais recente antes de enviar para VM, conferindo manifesto, ZIP, `.sha256`, comandos obrigatorios, `VERIFY-QA-PACKAGE.ps1` e status consolidado de release.
- `npm run qa:manual:sync`: sincroniza itens de QA verificaveis por maquina, como Authenticode, prechecks de UI, modo seguro e resultados `install-smoke-*`, marcando `authenticode` como `passed` quando MSI/NSIS estiverem `Valid` ou `blocked` quando ainda estiverem `NotSigned`.
- Quando um `install-smoke-*` valido volta de VM/maquina limpa, `qa:manual:sync` atualiza `install-nsis`/`install-msi` mesmo se estavam bloqueados e reabre os P0 dependentes de instalacao limpa para revisao manual.
- `npm run qa:manual:import`: importa em lote `manual-qa-evidence.json` gerado na VM/maquina limpa e atualiza os P0 visuais/fluxos sem passar item por item.
- `npm run qa:manual:bulk`: permite atualizar grupos manuais com evidencia real quando o mesmo teste cobre varias telas, exigindo `-ConfirmBulkPass` para aprovacao e mantendo instaladores/AuthentiCode protegidos por padrao.
- `npm run qa:manual:plan`: gera um plano compacto da sessao manual atual, separando VM/install-smoke, lote visual/fluxos, itens protegidos e assinatura.
- `npm run qa:manual:receive`: rotina unica para receber retorno da VM, sincronizando smoke/prechecks, importando evidencia manual quando existir e atualizando status manual/release.
- `npm run verify:feature-preservation`: trava a preservacao das rotas, motores, componentes e documentos de decisao que continuam valiosos mesmo quando nao aparecem na sidebar principal.
- `npm run qa:manual:receive -- -EvidenceDropPath <pasta>`: aceita a pasta `HermesQA` copiada da VM, a pasta extraida do pacote ou uma pasta contendo `manual-qa-evidence.json`/`install-smoke-*`, copiando tudo para `incoming-qa` da sessao antes de sincronizar.
- `npm run qa:manual:item -- -ItemId <id> -Status <status>`: atualiza um item da sessao manual com evidencia/notas e recalcula o status.
- `npm run qa:manual:status`: gera resumo da sessao manual sem bloquear por pendencias, util durante execucao do teste.
- `npm run qa:manual:verify`: gate estrito para release; falha enquanto houver P0 pendente/falhando ou instalador publico sem Authenticode `Valid`.
- `npm run release:signing:handoff`: consolida certificados locais, preflight de assinatura, instaladores atuais e comandos finais para configurar o certificado Code Signing correto.
- `npm run release:internal`: executa a esteira interna completa, gerando QA automatizado, pacote RC, verificacao do RC, sessao/status de QA manual, preflight de assinatura e status consolidado.
- `npm run release:status`: gera painel terminal, `.release/release-status.json` e `.release/release-status.md` com GO/NO-GO, bloqueios, QA tecnico, QA manual, pacote QA portatil mais recente, preflight de assinatura e candidatos de certificado.
- `npm run release:status`: tambem bloqueia quando a sessao de QA manual pertence a um release candidate diferente do pacote mais recente.
- `npm run release:beta`: gera e verifica o beta interno em uma unica rotina, atualizando `.release/beta-handoff/latest-beta-handoff.*` e `.release/beta-handoff/latest-beta-ready.*`.
- `npm run release:beta:handoff`: gera `.release/beta-handoff/hermes-beta-interno-*` com RC, instaladores, pacote QA portatil, doctor, status de release, evidencias de assinatura e instrucoes para beta controlado.
- `npm run release:beta:verify`: valida o beta handoff mais recente, conferindo manifesto, ZIP, `.sha256`, estrutura interna, QA portatil e instaladores contra seus manifestos.
- O beta interno agora inclui `GUIA-TESTADOR-BETA.md`, um roteiro direto para testador validar VM/maquina limpa, comandos obrigatorios, checklist visual e retorno da pasta `HermesQA`.
- `npm run release:beta:ready`: valida se o beta interno esta pronto para envio controlado, mantendo a distincao entre `BETA-INTERNAL-OK` e `NO-GO` publico.
- `npm run release:beta:drop`: prepara uma pasta pronta para VM/Windows Sandbox com QA portatil extraido, runner `RODAR-DENTRO-DA-VM.ps1`, arquivo `.wsb` e instrucoes de retorno.
- `npm run release:signing:certs`: lista certificados de assinatura candidatos no Windows Store, valida Code Signing/chave privada/expiracao e pode gerar template local de variaveis.
- `npm run release:signing:preflight`: verifica certificado, chave privada, timestamp, SignTool e assinatura atual dos instaladores antes do build assinado.

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

