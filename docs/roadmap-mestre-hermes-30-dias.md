# Hermes Optimizer - Roadmap Mestre de 30 Dias

Status: fonte oficial de direcao do produto para o proximo ciclo.

Periodo: 15 de junho de 2026 a 15 de julho de 2026.

Documento anterior: `docs/roadmap-funcional.md` permanece como memoria tecnica e historica.

Fonte complementar: `docs/prompt-hermes-ai-optimizer-v1-analise.md` consolida o prompt antigo do Hermes AI Optimizer V1 e separa o que continua valido do que mudou na direcao atual.

## 1. Meta do ciclo

Entregar o Hermes 0.2 como Beta/Release Candidate confiavel, simples e coerente:

1. O usuario entende o estado do computador em poucos segundos.
2. O diagnostico nao altera o Windows.
3. O Hermes recomenda o melhor caminho com base em evidencias locais.
4. O usuario aplica um perfil ou uma ferramenta com poucos cliques.
5. Toda alteracao informa impacto, cria registro e oferece restauracao quando tecnicamente possivel.
6. O instalador abre, atualiza e remove o aplicativo sem danificar dados do usuario.

O objetivo de 30 dias nao e terminar todas as ideias futuras. E criar a melhor fundacao possivel para um otimizador transparente, reversivel e agradavel de usar.

## 1.1 Regra dos 4 cliques

Todo fluxo comum do Hermes deve buscar resolver em ate 4 cliques.

Regra oficial:

```text
Clique 1: Analisar ou abrir recomendacao.
Clique 2: Escolher acao/perfil recomendado.
Clique 3: Confirmar resumo claro.
Clique 4: Concluir, reiniciar ou encerrar/restaurar quando necessario.
```

Para acoes de baixo risco e somente leitura, o ideal e 1 clique.

Para acoes de risco medio, o ideal e 2 ou 3 cliques:

1. Abrir recomendacao.
2. Revisar.
3. Aplicar.

Para acoes de risco alto, o Hermes pode passar de 4 cliques somente se houver motivo real:

- Administrador/UAC.
- Reinicio obrigatorio.
- Acao parcialmente irreversivel.
- Mudanca de seguranca, rede, boot, pagefile, kernel ou servicos criticos.

Mesmo quando precisar de mais seguranca, o fluxo deve continuar simples: poucas telas, texto curto e progresso claro.

## 1.2 Decisao de modo simples

O Dashboard permanece como painel de leitura, status e recomendacoes. A otimizacao passa a viver em uma area propria chamada `Otimizar`, com dois botoes grandes:

1. `Analisar PC`: diagnostico global, somente leitura, persistente e com recomendacoes.
2. `Otimizar Tudo`: orquestrador guiado que avalia 150 acoes em fases, escolhe perfil recomendado e encaminha para ferramentas/perfis quando houver risco ou necessidade de confirmacao.

O `Otimizar Tudo` nao substitui as ferramentas manuais. Ele e a entrada simples para o usuario comum, enquanto Central, Gamer, Limpeza, Reparo, Componentes e Personalizado continuam como controle avancado dentro do fluxo guiado.

Enquanto o produto estiver em modo seguro, o `Otimizar Tudo` deve operar como dry-run: validar, classificar, explicar e encaminhar, sem aplicar mudancas reais.

## 2. Visao do produto

O Hermes nao deve ser apenas um pacote de tweaks. Ele deve ser um assistente local de desempenho:

> Entender o PC, explicar o que importa, recomendar a melhor configuracao, aplicar somente o que o usuario aprovou e permitir voltar atras.

Promessa central:

- Poucos cliques.
- Diagnostico compreensivel.
- Recomendacoes personalizadas.
- Perfis por objetivo.
- Ferramentas separadas por funcao.
- Alteracoes rastreaveis.
- Seguranca e rollback como parte do produto.

O Hermes nao deve prometer "zero input lag", "mais FPS garantido" ou outros resultados que nao possam ser medidos e comprovados no computador do usuario.

## 3. Posicionamento e inspiracao

### O que aprender com o P3ninha Optimizer

- Entrada simples e orientada a resultado.
- Poucos passos para o usuario comum.
- Linguagem focada em jogos e desempenho.
- Fluxo organizado em etapas.
- Manutencao e atualizacao como parte da experiencia.
- Produto comercial com identidade clara.

### Como o Hermes deve se diferenciar

- Diagnostico global separado de qualquer alteracao.
- Explicacao exata do que sera modificado.
- Perfis de uso em vez de uma lista confusa de tweaks.
- Snapshot, historico e rollback visiveis.
- Comparacao antes/depois baseada em dados reais.
- Dashboard persistente e atualizado.
- Recomendacoes com motivo, impacto e confianca.
- Modo local-first, sem depender de conta ou nuvem para funcionar.
- Nenhuma informacao ficticia quando uma coleta estiver indisponivel.

## 4. Experiencia principal

Fluxo oficial:

```text
Abrir Hermes
  -> Exibir ultimo diagnostico salvo
  -> Atualizar metricas leves
  -> Analisar Agora
  -> Gerar diagnostico global somente leitura
  -> Atualizar Dashboard e Recomendacoes
  -> Usuario escolhe Perfil ou Ferramenta
  -> Hermes mostra resumo e impacto
  -> Confirmacao
  -> Snapshot e aplicacao
  -> Resultado, historico e opcao de restaurar
```

Meta de interacao:

- Um clique para analisar.
- Ate tres cliques para aplicar uma recomendacao simples.
- Uma confirmacao adicional apenas para acoes de risco alto.
- Nenhum fluxo comum deve exigir que o usuario entenda listas tecnicas antes de decidir.
- O detalhe tecnico fica em `Ver detalhes`, nao no caminho principal.

## 5. Arquitetura oficial de navegacao

### Dashboard

Exibe:

- Ultimo diagnostico salvo.
- Horario da ultima coleta.
- Saude geral e alertas.
- CPU, RAM, disco, GPU, sistema e rede.
- Perfil ativo, quando houver.
- Recomendacoes prioritarias.
- Comparacao resumida com o diagnostico anterior.
- Link de navegacao para a area `Otimizar`.

### Otimizar

Exibe:

- Botao `Analisar PC`.
- Botao `Otimizar Tudo`.
- Estado do modo seguro/dry-run.
- Plano de 150 acoes.
- Avisos de snapshot, rollback e confirmacao.
- Fluxo guiado para Central, Gamer, Componentes, Limpeza, Reparo e Personalizado quando necessario.

### Recomendacoes

Transforma dados em decisoes:

- O que foi encontrado.
- Por que isso importa.
- Nivel de impacto.
- Confianca da recomendacao.
- Qual perfil ou ferramenta resolve.
- Botao direto para revisar ou aplicar.

### Perfis de uso

Perfis combinam varias engines para um objetivo. Cada perfil possui:

- Descricao curta.
- `Aplicar perfil`.
- `Ver detalhes`.
- Aplicativos que devem permanecer abertos.
- Alteracoes propostas.
- Nivel de impacto.
- Duracao: temporario ou persistente.
- Metodo de restauracao.

Perfis oficiais deste ciclo:

1. Gamer.
2. Streamer.
3. Trabalho.
4. Economia.
5. Criacao.

### Ferramentas

Ferramentas executam uma tarefa especifica:

1. Limpeza.
2. Inicializacao.
3. Rede.
4. Seguranca.
5. Reparar Windows.
6. Avancado.

### Historico e Restauracao

Centraliza:

- Diagnosticos anteriores.
- Perfis aplicados.
- Ferramentas executadas.
- Snapshots.
- Resultados e falhas.
- Restauracao disponivel.

### Configuracoes

Centraliza:

- Preferencias de interface.
- Comportamento de coleta.
- Aplicativos protegidos.
- Modo seguro.
- Exportacao de relatorios.
- Informacao de versao e licenciamento.

## 6. Contrato do botao Analisar Agora

O antigo `Otimizar Agora` passa a ser `Analisar Agora`.

Subtitulo recomendado:

`Diagnostico global com Hermes IA`

O botao deve:

- Coletar hardware e sistema.
- Ler uso de CPU, memoria e disco.
- Avaliar inicializacao.
- Ler estado de seguranca.
- Identificar atualizacoes e alertas disponiveis.
- Detectar jogos e aplicativos relevantes.
- Executar benchmark leve e seguro quando habilitado.
- Gerar score, achados e recomendacoes.
- Salvar o resultado localmente.
- Atualizar todo o Dashboard.

O botao nao deve:

- Apagar arquivos.
- Fechar processos.
- Alterar energia.
- Alterar registro.
- Alterar rede ou DNS.
- Aplicar perfil.
- Instalar ou remover programas.

### Persistencia

Ao abrir o Hermes:

1. Mostrar imediatamente o ultimo diagnostico valido.
2. Marcar os dados com data e hora.
3. Atualizar em segundo plano apenas metricas dinamicas leves.
4. Manter dados estaticos ate uma nova analise completa.
5. Nunca substituir um valor real por zero ou exemplo quando a coleta falhar.
6. Mostrar `Indisponivel` e o motivo quando nao houver dado confiavel.

Dados estaticos:

- CPU, GPU, RAM total, placa-mae, Windows, build e arquitetura.

Dados dinamicos:

- Uso de CPU/RAM/disco, temperatura, rede, ping, uptime e espaco livre.

Dados historicos:

- Score, alertas, recomendacoes, data, duracao e versao do Hermes.

## 7. Contrato dos perfis

Todo perfil segue o mesmo ciclo:

```text
Selecionar perfil
  -> Selecionar aplicativo principal quando necessario
  -> Revisar resumo
  -> Criar snapshot
  -> Aplicar
  -> Manter sessao ativa
  -> Encerrar sessao e restaurar
```

Regras:

- Nunca fechar "tudo em segundo plano".
- Processos do Windows, drivers, anti-cheat e seguranca ficam protegidos.
- Discord, launchers e aplicativos auxiliares podem ser mantidos por escolha do usuario.
- Fechamento de aplicativo deve ser gracioso antes de qualquer acao forcada.
- Aplicativos desconhecidos nao sao fechados automaticamente.
- A lista de aplicativos protegidos deve ser editavel.
- A sessao ativa deve ficar visivel no Dashboard.

### Gamer

Objetivo: priorizar o jogo escolhido.

O Perfil Gamer deve ser dividido em duas ideias:

1. Preparacao inicial: ajustes revisaveis, componentes, reparos e configuracoes que podem exigir administrador ou reinicio.
2. Sessao Gamer: modo recorrente, temporario e restauravel para usar antes de jogar.

Fluxo:

1. Detectar jogos em execucao ou instalados.
2. Abrir seletor para o usuario escolher o jogo.
3. Perguntar quais auxiliares manter: Discord, launcher, overlay e outros.
4. Mostrar processos sugeridos para fechamento.
5. Aplicar energia, Game Mode, preferencia de GPU e prioridades permitidas.
6. Registrar estado anterior.
7. Exibir `Encerrar modo Gamer e restaurar`.

Primeiro MVP deve aproveitar o Gamer Engine ja existente.

Se nenhum jogo ou app alvo estiver aberto, o Hermes deve dizer isso claramente e oferecer selecao manual, em vez de aplicar ajustes agressivos sem contexto.

### Streamer

Objetivo: manter jogo, OBS e captura estaveis.

Prioridades:

- Proteger OBS e plugins.
- Priorizar captura e codificacao.
- Considerar encoder de GPU/CPU.
- Manter Discord e aplicativos escolhidos.
- Reduzir tarefas secundarias que disputem disco, CPU ou rede.
- Evitar ajustes que prejudiquem audio, camera ou captura.

### Trabalho

Objetivo: produtividade e estabilidade.

Prioridades:

- Manter navegador, reuniao, comunicacao e documentos.
- Reduzir inicializacao desnecessaria.
- Usar energia equilibrada.
- Evitar fechamento agressivo.
- Priorizar estabilidade e baixo ruido.

### Economia

Objetivo: aumentar autonomia e reduzir consumo.

Prioridades:

- Plano de energia economico.
- Reducao de tarefas secundarias permitidas.
- Orientacoes de brilho e tela.
- Limites conservadores.
- Restauracao simples ao conectar energia ou encerrar perfil.

### Criacao

Objetivo: edicao, renderizacao e aplicativos criativos.

Prioridades:

- Selecionar aplicativo principal.
- Proteger editores, renderizadores, plugins e gerenciadores de assets.
- Priorizar CPU, GPU, RAM e disco conforme o tipo de trabalho.
- Reduzir sincronizacoes e tarefas concorrentes somente com aprovacao.
- Evitar qualquer limpeza em pastas de projeto ou caches criativos sem revisao.

## 8. Contrato das ferramentas

Toda ferramenta deve informar:

- O que encontrou.
- O que pretende fazer.
- Espaco, impacto ou risco estimado.
- Se exige administrador.
- Se e reversivel.
- Qual snapshot sera criado.
- Resultado item a item.

### Limpeza

- Somente locais permitidos.
- Pre-visualizacao obrigatoria.
- Nunca tocar em Downloads, Documentos, Desktop, Imagens ou Videos.
- Quarentena antes da exclusao definitiva quando aplicavel.

### Inicializacao

- Mostrar impacto estimado.
- Desabilitar, nao apagar.
- Proteger itens do Windows e seguranca.
- Permitir restauracao individual.

### Rede

- Diagnosticar antes de alterar.
- Separar reparo, DNS e testes.
- Registrar configuracao anterior.
- Nao prometer reducao de ping sem medicao.

### Seguranca

- Somente leitura por padrao.
- Mostrar Defender, firewall, protecao do sistema e alertas.
- Encaminhar alteracoes para confirmacao explicita.

### Reparar Windows

- Separar verificacao de reparo.
- Explicar tempo e necessidade de administrador.
- `SFC` e `DISM` nunca fazem parte do diagnostico rapido.
- Salvar logs completos.

### Avancado

- Fora do fluxo comum.
- Linguagem tecnica e impacto visivel.
- Confirmacao forte.
- Nenhuma acao extrema automatica.

## 9. Hermes IA e recomendacoes

No primeiro ciclo, `Hermes IA` pode ser um motor local de regras e pontuacao. O valor esta na qualidade da decisao, nao em fingir que existe uma IA remota.

Cada recomendacao precisa conter:

- Evidencia observada.
- Interpretacao.
- Impacto esperado.
- Nivel de confianca.
- Risco.
- Acao recomendada.
- Perfil ou ferramenta relacionada.

Exemplo:

```text
Evidencia: 11 aplicativos iniciam com o Windows.
Impacto: o tempo de entrada pode aumentar e mais memoria fica ocupada.
Recomendacao: revisar 6 itens de baixo impacto.
Acao: abrir Ferramenta de Inicializacao.
```

## 10. Estado atual

### Ja existe e deve ser aproveitado

- Coleta local de diagnostico.
- Persistencia de relatorios.
- Advisor/Hermes AI local.
- Clean, Startup, Performance, Gamer, Advanced e Restore engines.
- Snapshots e contratos de rollback.
- Gamer Engine com processos protegidos e perfis salvos.
- Modo seguro de teste.
- Fallbacks indisponiveis em vez de dados ficticios.
- Build Tauri para MSI e NSIS.
- Documentacao de QA, assinatura e release.
- Area `Otimizar` separada do Dashboard com `Analisar PC` e `Otimizar Tudo`.
- Modal `Otimizar Tudo` em dry-run com 150 acoes agrupadas em 9 fases.
- Sidebar enxuta com Dashboard, Otimizar, Anti-Cheat, Manutencao Programada e Configuracoes.

### Existe parcialmente

- Dashboard persistente, mas ainda precisa comunicar validade e atualizacao.
- Fluxo principal ainda mistura analise e otimizacao.
- Perfis ainda usam Seguro, Trabalho, Gamer, Economia e Extremo.
- Central de Otimizacao ainda mistura niveis, ferramentas e perfis.
- Historico e rollback existem tecnicamente, mas precisam de experiencia unificada.
- Build instalavel existe, mas assinatura real nao foi concluida.

### Falta para a nova visao

- Renomear e simplificar o botao principal.
- Separar Perfis de Ferramentas na navegacao e na interface.
- Criar Streamer e Criacao.
- Transformar Gamer em sessao orientada ao jogo escolhido.
- Implementar estado visivel de perfil ativo.
- Encerrar perfil e restaurar estado anterior em um unico fluxo.
- Ligar recomendacoes diretamente aos modulos corretos.
- Comparacao antes/depois.
- QA manual completo em Windows 10 e Windows 11.
- Certificado real para assinatura.

## 11. Plano de execucao de 30 dias

### Dias 1 a 3 - Fundacao e contratos

- Aprovar este roadmap como fonte oficial.
- Definir tipos de dados de diagnostico, recomendacao, perfil e sessao.
- Definir rotas finais e nomes da navegacao.
- Marcar o roadmap antigo como historico.
- Criar lista de eventos e dados que precisam persistir.

Entregavel: arquitetura aprovada e backlog tecnico ordenado.

### Dias 4 a 7 - Analisar Agora e Dashboard

- Renomear `Otimizar Agora` para `Analisar Agora`.
- Remover limpeza e alteracoes do fluxo principal.
- Manter apenas coleta, benchmark seguro, advisor e persistencia.
- Carregar o ultimo diagnostico ao abrir.
- Atualizar metricas dinamicas sem apagar dados validos.
- Mostrar data, origem e estado de cada coleta.
- Ajustar textos, modal e relatorio final.

Entregavel: diagnostico global confiavel e persistente.

### Dias 8 a 14 - Perfis e Gamer MVP

- Criar nova pagina de Perfis.
- Implementar cartoes Gamer, Streamer, Trabalho, Economia e Criacao.
- Adicionar `Aplicar perfil` e `Ver detalhes`.
- Adaptar Gamer Engine para selecionar o jogo alvo.
- Permitir escolher aplicativos auxiliares protegidos.
- Mostrar processos sugeridos antes de fechar.
- Criar estado de sessao Gamer ativa.
- Implementar `Encerrar e restaurar`.
- Permanecer em dry-run ate os testes de rollback passarem.

Entregavel: perfil Gamer completo em modo de teste e estrutura dos demais perfis.

### Dias 15 a 20 - Demais perfis e ferramentas

- Criar MVP funcional de Streamer.
- Adaptar Trabalho e Economia ao novo contrato.
- Criar MVP de Criacao.
- Separar Limpeza, Inicializacao, Rede, Seguranca, Reparar Windows e Avancado.
- Remover niveis antigos da experiencia principal.
- Manter ferramentas tecnicas detalhadas fora da tela de Perfis.

Entregavel: arquitetura nova completa e navegavel.

### Dias 21 a 24 - Recomendacoes, historico e comparacao

- Ligar recomendacoes a Perfis e Ferramentas.
- Exibir evidencia, confianca, impacto e CTA.
- Unificar historico de diagnosticos, acoes e snapshots.
- Criar comparacao antes/depois sem promessas artificiais.
- Exibir restauracao disponivel por sessao ou ferramenta.

Entregavel: ciclo completo entre diagnostico, decisao, aplicacao e historico.

### Dias 25 a 27 - Seguranca e rollback real

- Testar rollback de limpeza com arquivo em quarentena.
- Testar restauracao de inicializacao.
- Testar plano de energia.
- Testar sessao Gamer e reabertura de aplicativos quando possivel.
- Validar falhas parciais e recuperacao.
- Revisar comandos administrativos, CSP e permissoes Tauri.
- Manter bloqueada qualquer acao sem rollback confiavel ou rotulo de irreversivel.

Entregavel: matriz de rollback aprovada.

### Dias 28 a 30 - Release Candidate

- Executar checklist manual completo.
- Testar Windows 10 e Windows 11.
- Testar instalacao limpa, atualizacao e desinstalacao.
- Revisar layout em resolucoes comuns.
- Validar desempenho de abertura e diagnostico.
- Gerar instalador assinado.
- Atualizar relatorio interno `pode lancar / nao pode lancar`.
- Corrigir somente bloqueadores P0 e P1.

Entregavel: Hermes 0.2 Beta/RC com decisao objetiva de lancamento.

## 12. Prioridades

### P0 - Obrigatorio para lancar

- `Analisar Agora` somente leitura.
- Dados persistentes com data e estado.
- Nenhum fallback apresentado como dado real.
- Perfis e Ferramentas separados.
- Gamer com selecao de alvo e lista de protecao.
- Snapshot antes de alteracoes.
- Rollback real validado.
- Modo seguro respeitado em frontend e backend.
- Instalador funcional e assinado.
- QA manual Windows 10/11.
- Relatorio interno em estado GO.

### P1 - Muito importante

- Streamer, Trabalho, Economia e Criacao em MVP.
- Recomendacoes com CTA direto.
- Comparacao antes/depois.
- Historico unificado.
- Sessao ativa visivel.
- Exportacao de relatorio.

### P2 - Pode entrar depois

- Conta Hermes Account.
- Licenciamento WooCommerce.
- Sincronizacao em nuvem.
- Atualizador automatico completo.
- Marketplace de perfis.
- Perfis por jogo mantidos remotamente.
- Benchmark longo.
- Telemetria opcional.

## 13. Licenciamento neste ciclo

O licenciamento permanece congelado para nao bloquear a qualidade do produto.

Decisao recomendada:

- Hermes 0.2 Beta funciona localmente sem login.
- A tela informa claramente que o licenciamento comercial ainda nao esta ativo.
- Nenhum bloqueio falso ou validacao simulada.
- A especificacao futura continua em `docs/futuro-hermes-auth.md`.

O licenciamento so entra em implementacao quando API, renovacao, revogacao, modo offline e suporte estiverem definidos.

## 14. Criterios mensuraveis de sucesso

- Dashboard mostra dados salvos em ate 1 segundo apos abrir.
- Diagnostico completo possui progresso, cancelamento seguro e resultado.
- Nenhuma acao destrutiva ocorre em `Analisar Agora`.
- Ate tres cliques entre recomendacao e confirmacao de uma acao simples.
- Ate quatro cliques para concluir um fluxo comum de perfil/ferramenta.
- 100% das alteracoes mostram resumo antes da aplicacao.
- 100% das alteracoes possuem rollback ou rotulo explicito de irreversivel.
- Nenhum processo desconhecido e fechado automaticamente.
- Nenhum valor de exemplo aparece como coleta real.
- Instalacao, atualizacao e desinstalacao passam no checklist.
- Testes automatizados, lint e build passam.
- Relatorio interno termina em GO antes de publicacao.

## 15. Fora do escopo dos 30 dias

- Tweaks de BIOS.
- Overclock.
- Drivers modificados.
- Alteracoes de kernel.
- Desativacao agressiva de seguranca.
- Limpeza de pastas pessoais.
- Fechamento indiscriminado de processos.
- Garantias de FPS, ping ou input lag.
- Implementacao apressada de pagamento/licenciamento.
- Reformulacao visual completa sem necessidade funcional.

## 16. Decisoes consolidadas

- O botao principal sera de diagnostico, nao de alteracao.
- O Dashboard preservara o ultimo diagnostico entre aberturas.
- Perfis e Ferramentas serao conceitos separados.
- Perfis terao `Aplicar perfil` e `Ver detalhes`.
- As explicacoes extensas ficarao em detalhes e recomendacoes.
- Gamer, Streamer, Trabalho, Economia e Criacao sao os perfis oficiais.
- Gamer pedira o jogo alvo e os aplicativos que devem permanecer.
- Perfis devem funcionar como sessoes restauraveis sempre que possivel.
- O Hermes priorizara poucos cliques sem esconder riscos.
- O P3ninha e uma referencia de simplicidade, nao um modelo para copiar promessas.
- Licenciamento continua congelado durante este ciclo.

## 17. Proximo horizonte

Depois do Hermes 0.2:

1. Medir uso real da Beta.
2. Corrigir os pontos de maior abandono.
3. Expandir perfis por jogo e aplicativo.
4. Implementar atualizador seguro.
5. Decidir modelo comercial.
6. Implementar licenciamento Hermes Account somente com backend pronto.
7. Adicionar benchmarks mais profundos e comparacoes historicas.
8. Criar ecossistema de modulos sem comprometer seguranca.

## 18. Regra final de produto

Quando houver conflito entre "parecer poderoso" e "ser confiavel", o Hermes escolhe ser confiavel.

Quando houver conflito entre "um clique" e "uma alteracao perigosa escondida", o Hermes explica e pede confirmacao.

Quando um dado nao puder ser coletado, o Hermes diz `Indisponivel`.

Quando uma melhoria nao puder ser medida, o Hermes a apresenta como estimativa, nunca como garantia.

