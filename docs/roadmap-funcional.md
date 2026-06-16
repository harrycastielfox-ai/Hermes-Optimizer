# Hermes Optimizer - Roadmap Funcional

> Documento historico. A direcao oficial do ciclo atual esta em
> `docs/roadmap-mestre-hermes-30-dias.md`.

Este documento é a memória técnica do Hermes Optimizer. O visual atual é a base oficial e não deve ser alterado sem pedido explícito.

## Princípios Obrigatórios

- Leve, transparente, reversível e local-first.
- Sem telemetria, nuvem, login, spyware, serviços residentes ou monitoramento permanente.
- Executar ações sob demanda e encerrar.
- Mostrar o que será feito antes de alterar o Windows.
- Criar log local e snapshot quando houver risco ou alteração importante.
- Nunca limpar Downloads, Documentos, Desktop, Imagens ou Vídeos.
- Nunca aplicar tweak extremo automaticamente.

## Arquitetura Interna

1. Análise e Segurança Engine (PRO): diagnóstico, benchmark, saúde, disco, memória, CPU, inicialização e segurança. Somente leitura.
2. Clean Engine: limpeza segura de temporários, caches e logs permitidos.
3. Startup Engine: detectar e habilitar/desabilitar inicialização. Nunca remover programas.
4. Performance Engine: energia, modo jogo, prioridade e suspensão reversível.
5. Gamer Engine: perfis Gamer, Streaming, Competitivo e Extremo.
6. Restore Engine: snapshots, rollback e histórico de reversão.

## Roadmap Oficial

- Fase 1: Diagnóstico real. Status informado: concluído.
- Fase 2: Benchmark Engine. Status informado: concluído.
- Fase 3: Histórico Inteligente Local. Status informado: concluído.
- Fase 4: Advisor Pro. Status: base local implementada; evoluir quando diagnóstico, benchmark e histórico reais estiverem conectados.
- Fase 5: Clean Engine Real. Próxima prioridade.
- Fase 6: Startup Manager Real.
- Fase 7: Perfis Hermes.
- Fase 8: Performance Engine Real.
- Fase 9: Restore Center Completo.
- Fase 10: Licenciamento Comercial.

## Fase 4 - Advisor Pro

Objetivo: gerar recomendações locais usando diagnóstico, benchmark e histórico local.

Regras:
- Sem IA.
- Sem internet.
- Sem telemetria.
- Sem alterações no Windows.
- Persistência local com retenção limitada.
- Recomendações devem explicar impacto e origem.

Exemplos:
- Muitos programas iniciando com o Windows.
- Pouco espaço livre no SSD.
- Queda de benchmark em relação ao histórico.
- Tempo de boot aumentou.
- RAM ou CPU com uso elevado.
- Segurança/Defender desativado.

## Decisão Técnica Atual

Como o backend atual ainda não possui engines reais expostas, a Fase 4 cria a fundação do Advisor Pro:

- comando Tauri sob demanda;
- regras locais em Rust;
- entrada explícita do estado atual do app;
- comparação com histórico local quando existir;
- persistência em JSON no diretório de dados do aplicativo;
- fallback visual preservado no frontend.

Quando as Fases 1, 2 e 3 reais forem conectadas ao backend, o Advisor Pro passa a consumir os snapshots reais sem mudar o visual.

## UX Oficial

O Hermes deve parecer simples para o usuário final, mesmo com várias engines internas.

Prioridades:
- simplicidade;
- velocidade;
- poucos cliques;
- automação sob demanda;
- linguagem clara para usuário leigo.

Evitar:
- excesso de abas;
- telas técnicas sem necessidade;
- botões demais;
- configurações expostas antes da hora.

## Botões Principais

A experiência comercial deve girar em torno de poucos comandos principais:

1. Analisar PC.
2. Otimizar Agora.
3. Restaurar.

O botão principal do produto é "Otimizar Agora".

O botão "Otimizar Agora" pode executar internamente um fluxo orquestrado:
- análise rápida;
- Advisor Pro;
- scan da Clean Engine;
- sugestões de Startup;
- validações de desempenho;
- validações de segurança;
- confirmação antes de qualquer alteração.

O usuário não precisa acionar manualmente cada engine.

Implementação obrigatória:
- "Otimizar Agora" deve ser um orquestrador de engines internas.
- A primeira etapa sempre é segura e somente leitura.
- Alterações reais só podem ocorrer depois de confirmação.
- O fluxo deve ser automático para o usuário, mas auditável internamente.

Status atual:
- Backend possui um comando sob demanda para gerar o plano seguro do "Otimizar Agora".
- O plano registra etapas internas, garantias de seguranca e historico local.
- Nesta versao o plano nao altera o Windows, nao limpa arquivos, nao desativa inicializacao e nao muda desempenho.
- O botao principal ja aciona o orquestrador sem alterar o visual aprovado.

## Clean Engine - Fluxo Obrigatório

Toda limpeza deve seguir:

1. Escanear.
2. Mostrar resultado.
3. Mostrar espaço recuperável.
4. Confirmar.
5. Executar.

Nunca apagar automaticamente. Nunca apagar sem exibir o que será removido.

## Startup Engine - Limites

Permitido:
- habilitar inicialização;
- desabilitar inicialização;
- classificar impacto;
- registrar reversão.

Proibido:
- desinstalar programas;
- apagar executáveis;
- remover softwares.

## Perfis Hermes Oficiais

Perfis planejados:
- Seguro: máxima estabilidade.
- Trabalho: equilíbrio entre desempenho e produtividade.
- Gamer: foco em jogos.
- Economia: redução de consumo e processos.
- Extremo: avançado, com confirmação extra.

Todos devem ser reversíveis.

## Advisor Pro - Evolução

O Advisor Pro deve usar, quando disponíveis:
- benchmark;
- diagnóstico;
- histórico local;
- snapshots;
- inicialização;
- limpeza.

Exemplos futuros:
- "Seu boot aumentou 12 segundos."
- "Você possui 22 programas iniciando com o Windows."
- "Seu SSD perdeu 15% de espaço livre."
- "Seu benchmark melhorou após a última otimização."

## Assistente Inteligente Futuro

Preparar arquitetura para uma IA local opcional do Hermes.

Nesta fase:
- não implementar IA real;
- não depender de nuvem;
- não tornar IA obrigatória.

Perguntas futuras desejadas:
- "Como está meu computador?"
- "O que posso otimizar?"
- "Por que meu boot está lento?"
- "Qual perfil devo usar?"

## Objetivo Comercial

Toda implementação deve considerar:
- estabilidade;
- escalabilidade;
- manutenção futura;
- experiência premium;
- facilidade de venda.

Evitar soluções temporárias que dificultem evolução futura.

## Futuro Oficial - Backlog Congelado

Estes itens ficam fora das fases atuais. Nao implementar sem pedido explicito.

- Hermes AI: assistente local e opcional, sem nuvem, sem OpenAI obrigatorio e sem telemetria obrigatoria.
- Janela Premium de Otimizacao: modal/janela ao clicar em "Otimizar Agora" ou aplicar perfil, com progresso real das engines, snapshot, status, raios suaves, logo Hermes e relatorio final.
- Configuracoes completas:
  - Seguranca e Recuperacao.
  - Atualizacoes.
  - Aparencia.
  - Notificacoes.
  - Idioma.
  - Licenca.
- Manutencao Programada: limpeza, diagnostico, benchmark e relatorios em ciclos diario, semanal ou mensal, sem servico residente obrigatorio.
- Telemetria: atualmente fora do roadmap. Se um dia existir, deve ser opcional, desativada por padrao, transparente e sem dados sensiveis.

Itens comerciais e tecnicos tambem permanecem planejados:
- Restore Center Completo.
- IA Local Hermes.
- Licenciamento Comercial.
- Autenticacao e licenciamento LigaHub/WooCommerce via MU-plugin WordPress real. Requisito salvo em `docs/futuro-ligahub-auth.md`.

## Comandos Windows/CMD - Politica

O Hermes pode usar utilitarios nativos do Windows quando isso for mais seguro do que reinventar uma acao.

Regras:
- nunca executar comandos encadeados sem plano individual;
- nunca executar manutencao pesada automaticamente;
- sempre detectar se exige administrador;
- sempre mostrar impacto antes;
- sempre gravar log local;
- preferir modo scan/verificacao antes de qualquer reparo.

Candidatos avaliados:
- `ipconfig /flushdns`: interessante para limpeza de cache de rede. Pode entrar futuramente como acao rapida e segura, com log.
- `sfc /scannow`: interessante, mas pertence a um futuro Centro de Reparo/Integridade do Windows. Nao deve rodar no "Otimizar Agora" padrao por ser lento e exigir administrador.
- `cleanmgr /sagerun:1`: usar com cuidado. Pode ser fallback opcional, mas o Clean Engine Real deve preferir escanear e listar itens com controle proprio antes de apagar.
- `defrag C: /O`: nao entra no fluxo automatico. Pode existir futuramente apenas como manutencao avancada, depois de detectar HDD/SSD e explicar impacto.
- `chkdsk C: /f /r`: nao entra no fluxo automatico. E uma acao pesada de reparo, pode exigir reinicio e travar a unidade; somente em tela avancada de reparo com confirmacao extra.

## Visual

O visual atual está aprovado.

Preservar:
- identidade visual atual;
- dashboard atual;
- sidebar atual;
- logo atual;
- cards atuais.

Não realizar redesign sem solicitação explícita.
