# Hermes Optimizer - Checklist de QA Manual

Data base: 2026-06-24

## Status de Gate

- [ ] **GO** somente se todos os itens P0 estiverem aprovados.
- [ ] **NO-GO** se qualquer fallback parecer dado real, qualquer acao real ocorrer em modo seguro, rollback falhar, ou o instalador nao abrir o app.

## P0 - Bloqueadores de Lancamento

- [x] Branding tecnico: app instalado aparece como "Hermes Optimizer"; identificador Tauri e titulo da janela nao usam valores default.
- [x] Build desktop: `npm run build:tauri` gera `build/index.html` e assets.
- [ ] Instalador debug: `npx tauri build --debug` gera MSI e NSIS em `src-tauri/target/debug/bundle`.
- [x] Lint: `npm run lint` passa sem analisar `build`, `dist`, `.tanstack` ou `src-tauri/target`.
- [x] Build web: `npm run build` passa.
- [x] Rust: `cargo test --lib` em `src-tauri` passa.
- [x] CSP ativa: `tauri.conf.json` nao usa `csp: null`.
- [x] Permissoes Tauri: `capabilities/default.json` mantem apenas permissoes necessarias.
- [ ] Fallbacks: qualquer indisponibilidade aparece como "Indisponivel", sem numeros demonstrativos.
- [ ] Analisar Agora: executa somente leitura, salva o diagnostico e nao cria snapshot desnecessario.
- [ ] Analisar Agora: nao move arquivos, fecha processos, altera energia, registro, rede, GPU ou configuracoes do Windows.
- [ ] Rollback: snapshot com manifesto valida e executa dry-run de restore sem erro.
- [x] Rollback real automatizado: teste `restores_clean_quarantine_file_backup_in_real_mode` passa.
- [x] Licenciamento: congelado explicitamente ou implementado; nenhuma tela deve prometer ativacao real sem backend.

## Evidencia Automatizada Mais Recente

- [x] `npm run qa:release` executado em 2026-06-23.
- [x] Release gates, TypeScript, lint, build web, build Tauri e Cargo check passaram.
- [x] Testes Rust: 10 aprovados, 0 falhas.
- [x] Instalador NSIS release encontrado.
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
- [x] Evidencia automatizada salva em `.release/qa-latest.json` por `npm run qa:release`.
- [ ] Evidencia de assinatura via `Get-AuthenticodeSignature` quando houver certificado real.
- [ ] Caminhos do MSI e NSIS gerados.
- [ ] Snapshot de restore validado.
- [ ] Decisao final de release: pode lancar / nao pode lancar.
