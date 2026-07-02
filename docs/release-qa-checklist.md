# Hermes Optimizer - Checklist de QA Manual

Data base: 2026-06-26

## Status de Gate

- [x] **QA funcional GO** quando todos os P0 funcionais estiverem aprovados.
- [ ] **Release publico GO** somente quando QA funcional estiver GO e MSI/NSIS estiverem com Authenticode `Valid`.
- [x] **NO-GO publico atual** porque os instaladores ainda estao `NotSigned` e o certificado Code Signing ainda nao foi configurado.

## P0 - Bloqueadores de Lancamento

- [x] Branding tecnico: app instalado aparece como "Hermes Optimizer"; identificador Tauri e titulo da janela nao usam valores default.
- [x] Build desktop: `npm run build:tauri` gera `build/index.html` e assets.
- [x] Instalador debug: `npx tauri build --debug` gera MSI e NSIS em `src-tauri/target/debug/bundle`.
- [x] Lint: `npm run lint` passa sem analisar `build`, `dist`, `.tanstack` ou `src-tauri/target`.
- [x] Build web: `npm run build` passa.
- [x] Rust: `cargo test --lib` em `src-tauri` passa.
- [x] CSP ativa: `tauri.conf.json` nao usa `csp: null`.
- [x] Permissoes Tauri: `capabilities/default.json` mantem apenas permissoes necessarias.
- [x] Fallbacks: qualquer indisponibilidade aparece como "Indisponivel", sem numeros demonstrativos.
- [x] Analisar Agora: executa somente leitura, salva o diagnostico e nao cria snapshot desnecessario.
- [x] Analisar Agora: nao move arquivos, fecha processos, altera energia, registro, rede, GPU ou configuracoes do Windows.
- [x] Restore Engine: rollback seguro de arquivo em quarentena validado por teste automatizado.
- [x] Rollback real automatizado: teste `restores_clean_quarantine_file_backup_in_real_mode` passa.
- [x] Licenciamento: congelado explicitamente ou implementado; nenhuma tela deve prometer ativacao real sem backend.

## Evidencia Automatizada Mais Recente

- [x] `npm run qa:release` executado em 2026-06-26.
- [x] Release gates, TypeScript, lint, build web, build Tauri frontend, Cargo check e Cargo test passaram.
- [x] Testes Rust: 26 aprovados, 0 falhas.
- [x] Catalogo de otimizacao: 160 acoes auditaveis, 160 implementadas/motoradas e 0 planejadas ou indisponiveis.
- [x] Instalador NSIS release encontrado.
- [x] Instalador MSI release encontrado.
- [x] Build Windows modo teste: `npm run build:windows:test` passou em 2026-06-29 e gerou MSI/NSIS com safe mode ativo.
- [x] Smoke local via Vite em 2026-06-26: Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao Programada e Configuracoes carregaram sem erro de console.
- [x] Smoke local do Botao 1 em modo teste: Preparar PC concluiu a Fase 1, exibiu recomendacao de reinicio e liberou a Fase 2 sem aplicar mudancas reais.
- [x] Smoke do Botao 2 em modo teste: coberto por `npm run verify:optimization-flow` e QA funcional manual consolidado.
- [x] `npm run verify:optimization-flow`: valida Botao 1, bloqueio da Fase 2, selecao Fate Trigger, modal do Botao 2 e painel de sucesso.
- [x] `npm run verify:safe-mode-flow`: valida Dashboard/Analise Agora como somente leitura e Botao 1/2 sem alteracao real em modo teste.
- [x] `npm run verify:build-mode`: valida que `build:windows:test`, `build:windows:real` e `build:windows:real:signed` sincronizam `VITE_HERMES_SAFE_TEST_MODE` e `HERMES_SAFE_TEST_MODE`.
- [x] Botao 2 recebeu lote de boot/servicos opcionais: `bcdedit /timeout 5` e servicos allowlistados sob demanda, sem limitar CPU/RAM e sem desativar servicos Microsoft em massa.
- [x] `npm run verify:branding-copy`: valida metadata Hermes, telas de erro em portugues e bloqueia residuos visiveis de starter.
- [x] `npm run verify:ui-shell`: valida sidebar principal, rotas aprovadas, areas rolaveis e chrome customizado da janela.
- [x] Pipeline assinado endurecido: valida certificado, chave privada, MSI/NSIS e Authenticode; sem certificado o build assinado bloqueia.
- [x] GitHub Actions `QA Windows Drop` valida lint, TypeScript, release gates, `qa:manual:drop:auto`, `release:status` e `git diff --check` em `windows-latest`.
- [x] `npm run release:candidate`: gera pacote interno com MSI/NSIS, SHA256, QA, docs e decisao GO/NO-GO.
- [x] `npm run release:candidate:verify`: valida integridade do pacote RC, hashes, manifesto e Authenticode antes de teste manual.
- [x] `npm run qa:manual:new`: gera sessao preenchivel de QA manual para maquina limpa/VM.
- [x] `npm run qa:manual:select` e `npm run qa:manual:select:best`: fixam uma sessao QA ativa para preservar progresso mesmo quando novos RCs/sessoes forem gerados.
- [x] `npm run qa:manual:item -- -ItemId <id> -Status <status>`: atualiza item individual da sessao manual com evidencia/notas.
- [x] `npm run qa:manual:bulk`: atualiza grupos de QA manual com uma evidencia real, mantendo instaladores e Authenticode protegidos por padrao.
- [x] `npm run qa:manual:plan`: gera roteiro compacto de VM, consolidacao, lote e assinatura para a sessao manual atual.
- [x] `npm run qa:manual:status`: resume a sessao manual atual sem bloquear por pendencias.
- [ ] `npm run qa:manual:verify`: gate estrito de release publica; deve passar somente depois que os instaladores publicos estiverem assinados.
- [x] `npm run verify:feature-preservation`: impede que rotas, motores, componentes e documentos importantes sejam removidos em refactors grandes.
- [x] `npm run release:signing:handoff`: gera o guia unico para destravar certificado Code Signing/AuthentiCode.
- [x] `npm run release:signing:doctor`: consolida segredos, certificado, preflight, status publico e proximo comando de assinatura em `.release/signing-doctor.*`.
- [x] `npm run release:internal`: executa a esteira interna QA -> RC -> verificacao do RC -> sessao/status de QA manual -> preflight de assinatura -> status consolidado.
- [x] `npm run release:status`: resume GO/NO-GO, QA tecnico, QA manual, pacote QA portatil, preflight de assinatura e bloqueios atuais.
- [x] `docs/release-policy.json`: registra Code Signing adiado, release publico assinado bloqueado e beta interno como canal atual.
- [x] `npm run release:beta`: gera e verifica o beta interno em uma unica rotina, criando ponteiros `latest-beta-*`.
- [x] `npm run release:beta:handoff`: gera pacote de beta interno separado do release publico, com RC, QA portatil, status, doctor e evidencias.
- [x] `npm run release:beta:verify`: valida o pacote de beta interno mais recente, conferindo estrutura, manifesto, ZIP, SHA256, QA portatil e instaladores.
- [x] Pacote beta interno inclui `GUIA-TESTADOR-BETA.md`, com roteiro simples para VM/maquina limpa e devolucao da pasta `HermesQA`.
- [x] `npm run release:beta:ready`: valida se o beta interno esta pronto para ser enviado a testador/VM sem confundir com GO publico.
- [x] `npm run release:beta:drop`: gera pasta pronta para VM/Windows Sandbox, com QA portatil extraido, runner e guia de retorno.
- [ ] Authenticode: instalador atual esta `NotSigned`.
- [x] QA funcional: `GO` com 11/11 P0 funcionais aprovados.
- [ ] Resultado publico: `NO-GO` ate concluir assinatura Authenticode.

## Fluxo Manual - Instalacao

1. Desinstalar versao anterior do Hermes Optimizer, se existir.
2. Instalar `src-tauri/target/release/bundle/nsis/Hermes Optimizer_0.1.0_x64-setup.exe`.
3. Abrir o app pelo menu Iniciar.
4. Confirmar janela normal, redimensionamento, arraste, maximizar/restaurar, logo Hermes, titulo e navegacao lateral.
5. Confirmar scroll do mouse em todas as telas longas.
6. Repetir com MSI quando o bundle release correspondente for gerado.

Resultado esperado: app abre sem tela branca, sem erro CSP visivel e sem assets ausentes.

## Fluxo Manual - Analisar Agora

1. Abrir Dashboard.
2. Clicar em **Analisar Agora**.
3. Confirmar que a analise inicia com um unico clique.
4. Acompanhar as seis etapas ate concluir.
5. Conferir diagnostico, inicializacao, scan de temporarios, desempenho, jogos/aplicativos e Hermes IA.
6. Fechar e abrir novamente o Hermes.

Resultado esperado: o Dashboard e atualizado com o novo diagnostico e recupera os dados salvos na proxima abertura. Nenhum arquivo e movido, nenhum processo e fechado e nenhuma configuracao do Windows e alterada, independentemente do modo seguro.

## Fluxo Manual - Botoes 1 e 2

1. Abrir a area Otimizar.
2. Confirmar que o Botao 2 aparece bloqueado antes da Fase 1.
3. Executar **Preparar PC** em modo teste e confirmar progresso visual limpo, sem despejar relatorio tecnico para o jogador.
4. Confirmar mensagem de sucesso/status e recomendacao de reinicio quando aplicavel.
5. Reabrir o Hermes depois do boot e confirmar que a Fase 2 fica disponivel somente quando a Fase 1 estiver concluida.
6. Executar **Otimizar Tudo** em modo teste e confirmar que a tela final mostra sucesso/status, nao uma lista tecnica longa.
7. Em VM controlada, repetir no build real antes de qualquer publicacao.

Resultado esperado: jogador entende que a otimizacao terminou com sucesso. Dados tecnicos ficam salvos internamente para suporte/debug, sem ocupar a primeira camada da interface.

## Fluxo Futuro - Restore Completo

Este fluxo fica preservado como evolucao do produto, mas nao bloqueia o release publico 0.1.0 enquanto as acoes reais continuarem allowlistadas, testadas e com caminhos irreversiveis rotulados.

1. Executar uma ferramenta ou perfil que tenha snapshot com rollback.
2. Validar snapshot via tela de reparo/restore ou comando interno `restore_validate_snapshot`.
3. Executar restore em dry-run.
4. Em ambiente controlado, executar restore real somente para snapshot de quarentena ou chave de registro permitida.
5. Conferir logs em `restore_events.json`.

Resultado esperado futuro: dry-run nunca altera sistema; restore real restaura apenas alvos permitidos e bloqueia qualquer item fora da allowlist.

## Fluxo Manual - Fallbacks

1. Rodar app fora do Tauri via `npm run dev`.
2. Navegar por Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao Programada e Configuracoes.
3. Conferir valores indisponiveis.

Resultado esperado: nenhum fallback mostra CPU, RAM, disco, app de startup, processo gamer, score ou recomendacao fake como se fosse leitura real.

## Fluxo Manual - CSP e Navegacao

1. Abrir instalador.
2. Navegar por todas as rotas laterais.
3. Recarregar em rotas internas.
4. Confirmar que o hash routing preserva a rota no desktop.

Resultado esperado: sem tela branca, sem navegacao para arquivo inexistente e sem recursos remotos obrigatorios para a experiencia desktop.

## Evidencias Necessarias

- [ ] Print do app instalado aberto.
- [x] Evidencia automatizada salva em `.release/qa-latest.json` por `npm run qa:release`, incluindo MSI/NSIS e SHA256.
- [x] Pacote interno de release candidate gerado em `.release/candidates/` por `npm run release:candidate`.
- [x] Integridade do pacote interno validada por `npm run release:candidate:verify`.
- [x] Sessao de QA manual gerada em `.release/manual-qa/` por `npm run qa:manual:new`.
- [x] Sessao de QA manual ativa selecionavel por `npm run qa:manual:select` ou `npm run qa:manual:select:best`, evitando que uma sessao nova esconda progresso anterior de QA.
- [x] Proximo item de QA manual consultavel por `npm run qa:manual:next`.
- [x] Alvo do item de QA manual preparavel por `npm run qa:manual:start`.
- [x] Ambiente Windows Sandbox para QA manual geravel por `npm run qa:manual:sandbox`.
- [x] Smoke de instalacao NSIS/MSI para Sandbox geravel por `npm run qa:manual:install-smoke`.
- [x] Pacote portatil de QA para VM/maquina limpa geravel por `npm run qa:manual:portable`.
- [x] Drop completo de QA manual para VM/maquina limpa geravel por `npm run qa:manual:drop`, com runner, `.wsb`, pacote extraido, guia e comando de retorno.
- [x] Drop completo de QA manual verificavel por `npm run qa:manual:drop:verify`, conferindo ZIP, SHA256, runner, `.wsb`, README e scripts extraidos.
- [x] Ultimo drop de QA manual abrivel por `npm run qa:manual:drop:open`, com pasta/guia no Explorer e fallback claro quando Windows Sandbox nao existir.
- [x] Windows Sandbox do drop acionavel por `npm run qa:manual:drop:sandbox` quando o recurso estiver disponivel no Windows.
- [x] Drop de QA manual exportavel por `npm run qa:manual:drop:zip`, gerando ZIP e SHA256 para copiar para VM/maquina limpa.
- [x] Drop de QA manual automatizavel localmente por `npm run qa:manual:drop:auto`, gerando drop, ZIP, SHA256, pasta temporaria limpa, execucao `RODAR-QA-HERMES-NA-VM.ps1 -QuickPassAll`, logs e relatorio em `.release/manual-qa-test-drop/results`.
- [x] `qa:manual:drop:auto` nao depende de Windows Sandbox, nao abre GUI e bloqueia install smoke/instalacao local com `HERMES_QA_AUTO_SAFE=1`, registrando o bloqueio em evidencia ao inves de alterar o Windows do host.
- [x] `qa:manual:drop:auto:install` existe como modo opt-in para VM/runner elevado, permitindo install smoke real de NSIS/MSI sem usar esse caminho como padrao local.
- [x] O workflow `.github/workflows/qa-windows-drop.yml` salva `.release/manual-qa-test-drop/results` e o ZIP do drop como artifacts do GitHub Actions.
- [x] O workflow `.github/workflows/release-windows-signed.yml` prepara release assinado manual em `windows-latest`, importando PFX via secrets e bloqueando publicacao se `release:public:verify` falhar.
- [x] Retorno do drop verificavel por `npm run qa:manual:drop:check`, conferindo se `qa-extraido\HermesQA` ja possui evidencia antes de importar para a sessao.
- [x] Evidencias do ultimo drop de QA manual recebiveis por `npm run qa:manual:drop:receive`, sem copiar manualmente para `C:\Temp` quando a pasta da VM/Sandbox estiver mapeada.
- [x] Pacote de QA manual inclui `RUN-MANUAL-QA-QUICK-PASS.ps1` para gerar evidencia unica dos itens visuais/fluxos nao protegidos quando a VM passou inteira, sem aprovar instalacao ou Authenticode.
- [x] Pacote portatil gera manifesto e `.sha256` do ZIP para conferir integridade antes de copiar/extrair.
- [x] Pacote portatil inclui `VERIFY-QA-PACKAGE.ps1` para conferir manifesto, instaladores, SHA256 e scripts antes do smoke.
- [x] Pacote portatil auditavel por `npm run qa:manual:doctor`, validando manifesto, ZIP, SHA256, comandos obrigatorios e status de release.
- [x] Evidencia manual de VM importavel em lote por `npm run qa:manual:import`, usando `manual-qa-evidence.json` gerado pelo pacote portatil.
- [x] Evidencia manual de VM coletavel por grupos no pacote portatil, reduzindo repeticao sem aprovar itens criticos automaticamente.
- [x] Retorno completo da VM consolidado por `npm run qa:manual:receive`, rodando sync/import/status/release-status em uma unica rotina.
- [x] `qa:manual:receive` aceita `-EvidenceDropPath` apontando para a pasta `HermesQA` copiada da VM, para a pasta extraida do pacote ou para uma pasta com `manual-qa-evidence.json`/`install-smoke-*`.
- [x] Evidencias manuais automatizaveis sincronizadas por `npm run qa:manual:sync`, incluindo Authenticode, prechecks de UI, modo seguro e resultados `install-smoke-*` quando existirem.
- [x] Depois que um `install-smoke-*` valido volta de VM/maquina limpa, `qa:manual:sync` aprova NSIS/MSI conforme o resultado e reabre os P0 bloqueados por ambiente limpo como pendentes para revisao manual.
- [x] Itens da sessao manual podem ser atualizados por `npm run qa:manual:item`.
- [x] Status da sessao de QA manual gerado em `.release/manual-qa/` por `npm run qa:manual:status`.
- [x] Status consolidado gerado em `.release/release-status.json` e `.release/release-status.md` por `npm run release:status`, incluindo pacote QA portatil mais recente, preflight de assinatura e candidatos de certificado quando existirem.
- [x] Pipeline publico unico geravel por `npm run release:public:pipeline:preview`, orquestrando lint, TypeScript, release gates, QA drop, assinatura/preflight, plano, status, gate publico e pacote publicavel sem liberar release quando o resultado segue NO-GO. A regeneracao de RC/sessao QA e opt-in via `-RegenerateReleaseCandidate`.
- [x] Pipeline publico salva o `signing doctor` no resultado final, exibindo o proximo comando de assinatura junto do status do release.
- [x] Pipeline publico assinado executavel por `npm run release:public:pipeline:signed` quando o PFX estiver configurado, importando PFX, gerando build assinado e criando RC atual sem install smoke real local.
- [x] Pipeline publico final executavel por `npm run release:public:pipeline:signed:install` em VM/runner elevado, importando PFX, gerando build assinado, criando RC atual, rodando install smoke real e bloqueando publicacao se o gate final falhar.
- [x] Pacote publico final geravel por `npm run release:public:package`, bloqueando a criacao quando `release:public:verify` ainda estiver `NO-GO` e copiando somente MSI/NSIS com Authenticode `Valid`.
- [x] Status consolidado bloqueia QA manual quando a sessao pertence a um RC diferente do pacote mais recente.
- [x] Pacote de beta interno geravel por `npm run release:beta:handoff`, mantendo aviso de `NO-GO` publico quando assinatura/QA manual ainda nao fecharam.
- [x] Pacote de beta interno verificavel por `npm run release:beta:verify`, gerando `beta-handoff-verification.json/md`.
- [x] Guia de testador do beta interno validado junto do handoff, incluindo comandos de verificacao, smoke, coleta manual e retorno por `qa:manual:receive`.
- [x] Prontidao de envio do beta interno verificavel por `npm run release:beta:ready`, gerando `beta-ready-to-send.json/md`.
- [x] Drop de execucao do beta geravel por `npm run release:beta:drop`, com `RODAR-DENTRO-DA-VM.ps1`, `HERMES-BETA-QA.wsb` e ponteiro `latest-beta-test-drop.*`.
- [x] Ponteiros do beta mais recente gerados em `.release/beta-handoff/latest-beta-handoff.*` e `.release/beta-handoff/latest-beta-ready.*`.
- [x] Certificados candidatos para assinatura listaveis por `npm run release:signing:certs`.
- [x] Preflight de assinatura gerado em `.release/signing-preflight.json` e `.release/signing-preflight.md` por `npm run release:signing:preflight`.
- [x] Diagnostico de assinatura gerado em `.release/signing-doctor.json` e `.release/signing-doctor.md` por `npm run release:signing:doctor`.
- [ ] Evidencia de assinatura via `Get-AuthenticodeSignature` quando houver certificado real.
- [x] Release publico sem assinatura permanece bloqueado por politica enquanto Code Signing estiver adiado.
- [x] Caminhos do MSI e NSIS gerados.
- [x] Snapshot/restore de quarentena validado por `cargo test --lib restores_clean_quarantine_file_backup_in_real_mode`.
- [x] Decisao final de release: `NO-GO publico` ate assinatura Authenticode.

## GitHub Actions - QA Windows Drop

O workflow `QA Windows Drop` roda em `windows-latest` e pode ser iniciado manualmente no GitHub:

1. Abra o repositorio no GitHub.
2. Entre em **Actions**.
3. Selecione **QA Windows Drop**.
4. Clique em **Run workflow**.
5. Para validar apenas o pipeline seguro, deixe `run_install_smoke=false`.
6. Para tentar fechar `install-nsis`/`install-msi` no runner descartavel, use `run_install_smoke=true`.
7. Escolha a branch e confirme.

Ele tambem roda em pull requests e em push na branch `main`.

O workflow executa:

```powershell
npm ci
npm run lint
npx tsc --noEmit
npm run verify:release-gates
npm run qa:manual:drop:auto
npm run release:status
git diff --check
```

Artifacts gerados:

- `hermes-qa-windows-drop-results`: logs, relatorios do auto drop, status de release e resumos da sessao QA.
- `hermes-qa-windows-drop-zip`: ZIP do drop, `.sha256` e manifesto do pacote.

Por padrao, o workflow mantem `HERMES_QA_AUTO_SAFE=1`, entao o runner nao abre GUI nem faz instalacao permanente silenciosa. As etapas que exigem instalacao/GUI ficam registradas como bloqueadas por seguranca ate serem validadas em ambiente apropriado.

Quando iniciado manualmente com `run_install_smoke=true`, o workflow roda `npm run qa:manual:drop:auto:install`, permitindo o install smoke real no runner Windows descartavel para coletar evidencia dos P0 `install-nsis` e `install-msi`.
