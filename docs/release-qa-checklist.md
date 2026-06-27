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
- [x] Testes Rust: 24 aprovados, 0 falhas.
- [x] Catalogo de otimizacao: 150 acoes auditaveis, 150 implementadas/motoradas e 0 planejadas ou indisponiveis.
- [x] Instalador NSIS release encontrado.
- [x] Instalador MSI release encontrado.
- [x] Build Windows modo teste: `npm run build:windows:test` passou em 2026-06-26.
- [x] Smoke local via Vite em 2026-06-26: Dashboard, Otimizar, Anti-Cheat, Defender, Manutencao Programada e Configuracoes carregaram sem erro de console.
- [x] Smoke local do Botao 1 em modo teste: Preparar PC concluiu a Fase 1, exibiu recomendacao de reinicio e liberou a Fase 2 sem aplicar mudancas reais.
- [ ] Smoke local do Botao 2 em modo teste: interacao visual ficou inconclusiva por falha do controle do navegador embutido; validar no app instalado/manual.
- [x] `npm run verify:optimization-flow`: valida Botao 1, bloqueio da Fase 2, selecao Fate Trigger, modal do Botao 2 e painel de sucesso.
- [x] Pipeline assinado endurecido: valida certificado, chave privada, MSI/NSIS e Authenticode; sem certificado o build assinado bloqueia.
- [x] `npm run release:candidate`: gera pacote interno com MSI/NSIS, SHA256, QA, docs e decisao GO/NO-GO.
- [x] `npm run release:candidate:verify`: valida integridade do pacote RC, hashes, manifesto e Authenticode antes de teste manual.
- [x] `npm run qa:manual:new`: gera sessao preenchivel de QA manual para maquina limpa/VM.
- [x] `npm run qa:manual:item -- -ItemId <id> -Status <status>`: atualiza item individual da sessao manual com evidencia/notas.
- [x] `npm run qa:manual:status`: resume a sessao manual atual sem bloquear por pendencias.
- [ ] `npm run qa:manual:verify`: deve passar somente depois que todos os P0 forem aprovados e instaladores publicos estiverem assinados.
- [x] `npm run release:internal`: executa a esteira interna QA -> RC -> verificacao do RC -> sessao/status de QA manual.
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
- [x] Itens da sessao manual podem ser atualizados por `npm run qa:manual:item`.
- [x] Status da sessao de QA manual gerado em `.release/manual-qa/` por `npm run qa:manual:status`.
- [ ] Evidencia de assinatura via `Get-AuthenticodeSignature` quando houver certificado real.
- [x] Caminhos do MSI e NSIS gerados.
- [ ] Snapshot de restore validado.
- [ ] Decisao final de release: pode lancar / nao pode lancar.
