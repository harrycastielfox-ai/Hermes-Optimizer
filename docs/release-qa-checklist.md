# Hermes Optimizer - Checklist de QA Manual

Data base: 2026-06-26

## Status de Gate

- [ ] **GO** somente se todos os itens P0 estiverem aprovados.
- [ ] **NO-GO** se qualquer fallback parecer dado real, qualquer acao real ocorrer em modo seguro, rollback falhar, ou o instalador nao abrir o app.

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
- [ ] Analisar Agora: executa somente leitura, salva o diagnostico e nao cria snapshot desnecessario.
- [ ] Analisar Agora: nao move arquivos, fecha processos, altera energia, registro, rede, GPU ou configuracoes do Windows.
- [ ] Rollback: snapshot com manifesto valida e executa dry-run de restore sem erro.
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
- [ ] Smoke local do Botao 2 em modo teste: interacao visual ficou inconclusiva por falha do controle do navegador embutido; validar no app instalado/manual.
- [x] `npm run verify:optimization-flow`: valida Botao 1, bloqueio da Fase 2, selecao Fate Trigger, modal do Botao 2 e painel de sucesso.
- [x] `npm run verify:safe-mode-flow`: valida Dashboard/Analise Agora como somente leitura e Botao 1/2 sem alteracao real em modo teste.
- [x] `npm run verify:build-mode`: valida que `build:windows:test`, `build:windows:real` e `build:windows:real:signed` sincronizam `VITE_HERMES_SAFE_TEST_MODE` e `HERMES_SAFE_TEST_MODE`.
- [x] Botao 2 recebeu lote de boot/servicos opcionais: `bcdedit /timeout 5` e servicos allowlistados sob demanda, sem limitar CPU/RAM e sem desativar servicos Microsoft em massa.
- [x] `npm run verify:branding-copy`: valida metadata Hermes, telas de erro em portugues e bloqueia residuos visiveis de starter.
- [x] `npm run verify:ui-shell`: valida sidebar principal, rotas aprovadas, areas rolaveis e chrome customizado da janela.
- [x] Pipeline assinado endurecido: valida certificado, chave privada, MSI/NSIS e Authenticode; sem certificado o build assinado bloqueia.
- [x] `npm run release:candidate`: gera pacote interno com MSI/NSIS, SHA256, QA, docs e decisao GO/NO-GO.
- [x] `npm run release:candidate:verify`: valida integridade do pacote RC, hashes, manifesto e Authenticode antes de teste manual.
- [x] `npm run qa:manual:new`: gera sessao preenchivel de QA manual para maquina limpa/VM.
- [x] `npm run qa:manual:item -- -ItemId <id> -Status <status>`: atualiza item individual da sessao manual com evidencia/notas.
- [x] `npm run qa:manual:bulk`: atualiza grupos de QA manual com uma evidencia real, mantendo instaladores e Authenticode protegidos por padrao.
- [x] `npm run qa:manual:status`: resume a sessao manual atual sem bloquear por pendencias.
- [ ] `npm run qa:manual:verify`: deve passar somente depois que todos os P0 forem aprovados e instaladores publicos estiverem assinados.
- [x] `npm run verify:feature-preservation`: impede que rotas, motores, componentes e documentos importantes sejam removidos em refactors grandes.
- [x] `npm run release:internal`: executa a esteira interna QA -> RC -> verificacao do RC -> sessao/status de QA manual -> preflight de assinatura -> status consolidado.
- [x] `npm run release:status`: resume GO/NO-GO, QA tecnico, QA manual, pacote QA portatil, preflight de assinatura e bloqueios atuais.
- [x] `npm run release:beta`: gera e verifica o beta interno em uma unica rotina, criando ponteiros `latest-beta-*`.
- [x] `npm run release:beta:handoff`: gera pacote de beta interno separado do release publico, com RC, QA portatil, status, doctor e evidencias.
- [x] `npm run release:beta:verify`: valida o pacote de beta interno mais recente, conferindo estrutura, manifesto, ZIP, SHA256, QA portatil e instaladores.
- [x] Pacote beta interno inclui `GUIA-TESTADOR-BETA.md`, com roteiro simples para VM/maquina limpa e devolucao da pasta `HermesQA`.
- [x] `npm run release:beta:ready`: valida se o beta interno esta pronto para ser enviado a testador/VM sem confundir com GO publico.
- [x] `npm run release:beta:drop`: gera pasta pronta para VM/Windows Sandbox, com QA portatil extraido, runner e guia de retorno.
- [ ] Authenticode: instalador atual esta `NotSigned`.
- [ ] Resultado publico: `NO-GO` ate concluir assinatura e QA manual.

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

## Fluxo Manual - Rollback

1. Executar uma ferramenta ou perfil que tenha snapshot com rollback.
2. Validar snapshot via tela de reparo/restore ou comando interno `restore_validate_snapshot`.
3. Executar restore em dry-run.
4. Em ambiente controlado, executar restore real somente para snapshot de quarentena ou chave de registro permitida.
5. Conferir logs em `restore_events.json`.

Resultado esperado: dry-run nunca altera sistema; restore real restaura apenas alvos permitidos e bloqueia qualquer item fora da allowlist.

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
- [x] Proximo item de QA manual consultavel por `npm run qa:manual:next`.
- [x] Alvo do item de QA manual preparavel por `npm run qa:manual:start`.
- [x] Ambiente Windows Sandbox para QA manual geravel por `npm run qa:manual:sandbox`.
- [x] Smoke de instalacao NSIS/MSI para Sandbox geravel por `npm run qa:manual:install-smoke`.
- [x] Pacote portatil de QA para VM/maquina limpa geravel por `npm run qa:manual:portable`.
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
- [x] Status consolidado bloqueia QA manual quando a sessao pertence a um RC diferente do pacote mais recente.
- [x] Pacote de beta interno geravel por `npm run release:beta:handoff`, mantendo aviso de `NO-GO` publico quando assinatura/QA manual ainda nao fecharam.
- [x] Pacote de beta interno verificavel por `npm run release:beta:verify`, gerando `beta-handoff-verification.json/md`.
- [x] Guia de testador do beta interno validado junto do handoff, incluindo comandos de verificacao, smoke, coleta manual e retorno por `qa:manual:receive`.
- [x] Prontidao de envio do beta interno verificavel por `npm run release:beta:ready`, gerando `beta-ready-to-send.json/md`.
- [x] Drop de execucao do beta geravel por `npm run release:beta:drop`, com `RODAR-DENTRO-DA-VM.ps1`, `HERMES-BETA-QA.wsb` e ponteiro `latest-beta-test-drop.*`.
- [x] Ponteiros do beta mais recente gerados em `.release/beta-handoff/latest-beta-handoff.*` e `.release/beta-handoff/latest-beta-ready.*`.
- [x] Certificados candidatos para assinatura listaveis por `npm run release:signing:certs`.
- [x] Preflight de assinatura gerado em `.release/signing-preflight.json` e `.release/signing-preflight.md` por `npm run release:signing:preflight`.
- [ ] Evidencia de assinatura via `Get-AuthenticodeSignature` quando houver certificado real.
- [x] Caminhos do MSI e NSIS gerados.
- [ ] Snapshot de restore validado.
- [ ] Decisao final de release: pode lancar / nao pode lancar.
