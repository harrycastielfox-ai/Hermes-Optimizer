# Prompt Hermes AI Optimizer V1 - Analise e Consolidacao

Data: 2026-06-15

Fonte: prompt antigo fornecido pelo usuario em `pasted-text.txt`.

## Resumo

O prompt V1 define o Hermes como um assistente local de otimizacao, nao como uma colecao de scripts. A ideia central continua correta:

- Detectar automaticamente o computador.
- Entender o jogo ou objetivo do usuario.
- Escolher a configuracao mais adequada.
- Reduzir escolhas tecnicas.
- Manter logs, backup e reversao.
- Entregar uma experiencia premium com poucos cliques.

## O que continua valido

- O usuario nao quer aprender Windows.
- O usuario nao quer escolher entre dezenas de opcoes.
- O Hermes deve diagnosticar hardware, Windows, componentes, jogos e problemas.
- O Hermes deve classificar o PC e escolher perfis automaticamente.
- `Preparar para Jogar` deve ser um fluxo guiado, com progresso e resultado final.
- `Reparar Windows` deve existir como area separada.
- `Anti-Cheat` deve ser separado e nao automatico.
- Logs por etapa sao obrigatorios.
- Toda mudanca real precisa de backup, snapshot ou restauracao.
- A experiencia deve priorizar poucos cliques e feedback claro.

## O que mudou na visao atual

O prompt V1 colocava varios botoes no Dashboard. A decisao atual e melhor:

- `Dashboard`: apenas leitura, status, diagnostico salvo e recomendacoes.
- `Otimizar`: area propria com dois botoes principais.
- `Anti-Cheat`: area separada.
- `Manutencao Programada`: area separada.
- `Configuracoes`: area separada.

Isso preserva a simplicidade sem misturar monitoramento com execucao.

## Mapeamento para o Hermes atual

### Ja existe ou esta em andamento

- Dashboard com coleta local.
- Persistencia de diagnostico.
- Hermes IA local por regras/recomendacoes.
- Area `Otimizar` separada.
- Botao `Analisar PC` somente leitura.
- Botao `Otimizar Tudo` em dry-run.
- Plano de 150 acoes em 9 fases.
- Anti-Cheat separado.
- Manutencao Programada separada.
- Configuracoes separadas.
- Motores de Clean, Startup, Performance, Gamer, Advanced e Restore.
- Rollback parcial e testes nativos.

### Falta transformar em execucao real segura

- Componentes essenciais reais: Visual C++, DirectX e dependencias.
- Reparo Windows guiado: SFC, DISM, Windows Update, DNS e Winsock.
- Modo Gamer recorrente com jogo/app alvo.
- Protecao configuravel de Discord, launchers, OBS e apps auxiliares.
- Receitas externas em JSON sem recompilar.
- Perfil automatico por hardware e objetivo.
- Fluxo de reinicio e retomada pos-boot.
- Relatorio antes/depois.
- Rollback validado para cada acao real.

## Regra de produto herdada do prompt

O Hermes deve descobrir:

```text
Qual e o computador do usuario,
qual jogo ou objetivo esta em uso,
e qual configuracao segura faz sentido para esse cenario.
```

O usuario comum deve conseguir abrir o Hermes, entrar em `Otimizar`, clicar em `Analisar PC` ou `Otimizar Tudo` e receber um plano claro sem entender registro, servicos, energia, drivers ou processos.

## Cuidado importante

O prompt V1 fala em maxima automacao. Na versao atual, a automacao precisa obedecer uma regra mais forte:

```text
Automatizar a decisao, nao esconder o risco.
```

Mudancas reais de rede, servicos, reparo, componentes, pagefile, kernel, seguranca ou boot precisam de confirmacao, snapshot, log e restauracao quando possivel.

## Direcao recomendada

Implementar o `Otimizar Tudo` por fases liberaveis:

1. Analise e classificacao do PC.
2. Plano de acoes recomendado.
3. Confirmacao do usuario.
4. Snapshot.
5. Execucao apenas de acoes com rollback validado.
6. Reinicio quando necessario.
7. Retomada automatica apos boot.
8. Relatorio final.

As acoes sem rollback ou com risco alto devem aparecer como `Manual`, `Indisponivel` ou `Exige confirmacao forte`.
