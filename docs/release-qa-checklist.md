# Hermes Optimizer - Checklist de QA Manual

Data base: 2026-06-15

## Status de Gate

- [ ] **GO** somente se todos os itens P0 estiverem aprovados.
- [ ] **NO-GO** se qualquer fallback parecer dado real, qualquer acao real ocorrer em modo seguro, rollback falhar, ou o instalador nao abrir o app.

## P0 - Bloqueadores de Lancamento

- [ ] Branding tecnico: app instalado aparece como "Hermes Optimizer"; identificador Tauri e titulo da janela nao usam valores default.
- [ ] Build desktop: `npm run build:tauri` gera `build/index.html` e assets.
- [ ] Instalador debug: `npx tauri build --debug` gera MSI e NSIS em `src-tauri/target/debug/bundle`.
- [ ] Lint: `npm run lint` passa sem analisar `build`, `dist`, `.tanstack` ou `src-tauri/target`.
- [ ] Build web: `npm run build` passa.
- [ ] Rust: `cargo test` em `src-tauri` passa.
- [ ] CSP ativa: `tauri.conf.json` nao usa `csp: null`.
- [ ] Permissoes Tauri: `capabilities/default.json` mantem apenas permissoes necessarias.
- [ ] Fallbacks: qualquer indisponibilidade aparece como "Indisponivel", sem numeros demonstrativos.
- [ ] Analisar Agora: executa somente leitura, salva o diagnostico e nao cria snapshot desnecessario.
- [ ] Analisar Agora: nao move arquivos, fecha processos, altera energia, registro, rede, GPU ou configuracoes do Windows.
- [ ] Rollback: snapshot com manifesto valida e executa dry-run de restore sem erro.
- [ ] Rollback real automatizado: teste `restores_clean_quarantine_file_backup_in_real_mode` passa.
- [ ] Licenciamento: congelado explicitamente ou implementado; nenhuma tela deve prometer ativacao real sem backend.

## Fluxo Manual - Instalacao

1. Desinstalar versao anterior do Hermes Optimizer, se existir.
2. Instalar `src-tauri/target/debug/bundle/nsis/Hermes Optimizer_0.1.0_x64-setup.exe`.
3. Abrir o app pelo menu Iniciar.
4. Confirmar tela cheia, logo Hermes, titulo "Hermes Optimizer" e navegacao lateral.
5. Repetir com MSI: `src-tauri/target/debug/bundle/msi/Hermes Optimizer_0.1.0_x64_en-US.msi`.

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
2. Navegar por Dashboard, Diagnostico, Limpeza, Inicializacao, Central, Perfis, Personalizado e Seguranca.
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
- [ ] Logs dos comandos `npm run lint`, `npm run build`, `npm run build:tauri`, `cargo test`.
- [ ] Evidencia de assinatura via `Get-AuthenticodeSignature` quando houver certificado real.
- [ ] Caminhos do MSI e NSIS gerados.
- [ ] Snapshot de restore validado.
- [ ] Decisao final de release: pode lancar / nao pode lancar.
