# Hermes Optimizer - Objetivo do Projeto

## Objetivo geral

O Hermes Optimizer deve ser um aplicativo Windows de otimizacao local, direto e confiavel, com foco em poucos cliques: o usuario entende o estado do PC, executa um fluxo guiado e recebe status claro de sucesso, progresso e proximo passo. Detalhes tecnicos de execucao ficam salvos internamente para suporte/debug, sem virar a experiencia principal do jogador.

A meta de produto e competir com otimizadores de alto nivel do mercado, unindo dashboard tecnico, otimizacao gamer, recomendacoes locais e automacao segura em uma experiencia simples.

## Direcao aprovada

- O Dashboard acompanha a maquina e deve continuar separado da area de otimizacao.
- A area Otimizar deve resolver o fluxo principal em dois botoes: Preparar PC primeiro, Otimizar Tudo depois.
- O Botao 2 deve ficar bloqueado ate a Fase 1 ser concluida.
- Depois da Fase 1, o Hermes deve recomendar reinicio e detectar quando o Windows iniciou de novo.
- O aplicativo deve abrir como administrador no Windows instalado/debug, pois DNS, DISM, servicos, hibernacao e ajustes de sistema exigem elevacao.
- O modo teste pode permanecer enquanto o motor real amadurece, mas o objetivo final e aplicar funcoes reais quando liberado.
- O modo teste e o padrao de build. O modo real so deve ser liberado explicitamente com `VITE_HERMES_SAFE_TEST_MODE=false` no frontend e `HERMES_SAFE_TEST_MODE=false` no backend Rust.
- O build real deve ser gerado pelo script controlado `npm run build:windows:real`; build real assinado usa `npm run build:windows:real:signed`.
- Fate Trigger deve ser prioridade maxima no modo Gamer, considerando Steam e Unreal Engine 5.
- O usuario deve poder escolher o jogo alvo quando fizer sentido.
- O Hermes deve preservar Discord, Steam, anti-cheats, drivers e processos essenciais.
- A experiencia deve buscar menos de quatro cliques para resolver o caminho comum.

## Ideias aprovadas

- Misturar o melhor do Hermes atual com a inspiracao de fluxos simples como o Peninha: poucos botoes, progresso claro e recomendacao por maquina.
- Ter perfis de uso: Gamer, Streamer, Trabalho, Economia, Criacao e Avancado.
- Separar perfis e ferramentas, sem espalhar muitos botoes manuais na tela principal.
- Manter Dashboard antigo como base visual/funcional.
- Manter Anti-Cheat, Defender, Manutencao Programada e Configuracoes na sidebar.
- Defender nao deve ser desligado. Qualquer liberacao deve ser especifica para o executavel/pasta do Hermes e com protecao ativa.
- Dependencias gamer devem focar runtimes: VC++ Redistributable 2005-2022 x86/x64 e DirectX End-User Runtime.
- Build Tools, Visual Studio Installer, Windows SDK e Windows App Runtime nao devem ser instalados automaticamente como parte gamer.
- Toda dependencia baixada deve passar por fonte oficial, hash e assinatura antes de instalar.
- A interface principal deve mostrar sucesso/status e progresso rumo a mais de 150 acoes reais, sem fingir funcao inexistente.
- Dados tecnicos de execucao devem existir para suporte/debug, mas nao devem virar uma tela longa para o jogador comum.
- Japones existe como idioma intermediario.

## Funcionalidades existentes

- Dashboard com diagnostico local do PC.
- Area Otimizar separada.
- Fluxo de dois botoes: Preparar PC e Otimizar Tudo.
- Bloqueio da Fase 2 antes da Fase 1.
- Persistencia local de diagnostico, status e ciclo de execucao.
- Recomendacao de reinicio e leitura de boot do Windows.
- Selecionador de DNS.
- Status de execucao por fase com dados tecnicos internos.
- Contagem tecnica de acoes por pacote: 150 acoes auditaveis, 148 implementadas/motoradas e 2 planejadas ou indisponiveis na validacao de 2026-06-26.
- Startup Engine ampliado com leitura de pasta Startup, tarefas agendadas de logon/boot, OneDrive, Teams, launchers, updaters e baseline de boot.
- Advanced Engine ampliado com Ultimate Performance opcional, suspensao seletiva USB OFF e PCIe Link State OFF por `powercfg` allowlistado.
- Gamer Engine ampliado com revisao de overlays Steam/Xbox/GPU, excecoes OBS/BlueStacks/WSL e prioridade transiente do jogo ativo.
- Profiles Engine ampliado com validacao de conflitos, persistencia local do perfil recomendado e resumo interno do perfil aplicado.
- Verificacao de admin.
- Manifesto Windows com `requireAdministrator`.
- Catalogo advanced allowlistado com Game Mode, GameDVR, DNS, DISM, visual gamer, hibernacao, servicos, MMCSS e prioridade Fate Trigger.
- Modulos preservados: Anti-Cheat, Defender, Manutencao Programada e Configuracoes.
- Sistema de idioma local: Portugues, English, Espanol e Japones intermediario.
- CSP Tauri restrita e janela customizada sem decoracao nativa.

## Funcionalidades planejadas

- Liberar motor real fora do modo teste com criterio.
- Criar build/release real com as duas chaves de modo real alinhadas entre frontend e backend.
- Finalizar execucao real do Botao 1:
  - Game Mode.
  - GameDVR/Xbox Game Bar OFF.
  - Visual gamer minimo.
  - DNS escolhido.
  - Limpeza segura.
  - Startup controlavel.
  - Servicos seguros.
  - DISM/component store.
  - VC++/DirectX verificados.
- Finalizar execucao real do Botao 2:
  - MMCSS Gamer Pack.
  - Prioridade Fate Trigger/UE5.
  - Ajustes avancados de rede.
  - Apps em segundo plano e notificacoes gamer via Advanced Engine.
  - Perfil recomendado.
  - Processos seguros com preservacao de Discord/Steam/anti-cheat.
- Historico interno do que foi feito em execucoes anteriores para suporte/debug.
- Checklist de QA e testes manuais.
- Build instalavel assinado.
- Licenciamento congelado oficialmente ou implementado.
- Politica futura de licenca expirada: pausar recursos premium e, se aprovado, oferecer/automatizar retorno ao baseline inicial do proprio usuario; nunca piorar o PC propositalmente.
- Relatorio interno de release: pode lancar / nao pode lancar.

## Regras de preservacao de recursos

- Presumir que toda funcionalidade existente possui valor para o projeto.
- Nao remover modulos sem decisao explicita.
- Dashboard e Otimizar sao areas diferentes.
- Nao transformar funcoes importantes em botoes soltos se elas podem entrar no fluxo guiado.
- Nao instalar toolchain pesada de desenvolvimento como dependencia gamer.
- Nao fechar anti-cheats, drivers, antivirus, Steam, Discord ou processos essenciais sem regra clara.
- Nao desativar Defender.
- Nao esconder fallbacks como se fossem dados reais; rotular como indisponivel quando necessario.
- Nao aplicar alteracoes reais sem passar pelo motor allowlistado.
- Nao perder a simplicidade: o caminho comum deve continuar curto.

## Principios de design e usabilidade

- Poucos cliques, feedback visual forte e progresso por porcentagem/fase.
- Visual premium, limpo e gamer, sem poluir o usuario com botoes tecnicos demais.
- Dashboard deve informar; Otimizar deve agir.
- O jogador deve ver sucesso, status e proximo passo; detalhes tecnicos ficam internos para nao parecer tela de programador.
- Estados importantes devem ser claros: aguardando, bloqueado, em teste, aplicado, indisponivel, planejado.
- A sidebar deve conter apenas areas principais.
- Componentes devem respeitar as cores escolhidas nas configuracoes.
- O app deve abrir como janela normal, redimensionavel, com controles customizados funcionando.

## Decisoes importantes

- A meta oficial e construir um aplicativo capaz de disputar mercado, nao apenas um prototipo.
- O fluxo principal sera em dois botoes.
- Fate Trigger/UE5 e prioridade especial do Perfil Gamer.
- O modo de teste nao e o produto final, mas e mantido ate o motor real ser confiavel.
- Rollback/snapshot nao deve bloquear o desejo de funcionamento, mas dados internos e reversibilidade continuam importantes para confianca.
- Inspiracao em outros apps deve ser usada como referencia de experiencia e categorias, sem copiar codigo, marca ou comportamento fechado.
- O Hermes deve salvar estado localmente para continuar depois de fechar, abrir ou reiniciar.
- O projeto deve evoluir passo a passo, sempre validando TypeScript, lint, build Tauri e o app aberto quando possivel.
