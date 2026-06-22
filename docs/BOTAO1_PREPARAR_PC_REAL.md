# Botao 1 - Preparar PC em modo real

Este documento descreve o comportamento esperado do Botao 1 quando o Hermes for gerado com modo real:

- Frontend: `VITE_HERMES_SAFE_TEST_MODE=false`
- Backend Rust: `HERMES_SAFE_TEST_MODE=false`
- Comando recomendado: `npm run build:windows:real`

## Regra de administrador

Em modo real, o Botao 1 nao deve aplicar parcialmente.

Se o Hermes nao estiver elevado, a fila para no passo `Verificar administrador` e orienta o usuario a abrir o aplicativo com UAC confirmado.

Motivo: DNS, DISM, servicos, hibernacao, dependencias e parte dos ajustes de sistema exigem administrador. Aplicar apenas a parte de usuario causaria uma experiencia inconsistente.

## Acoes reais esperadas

### Leitura obrigatoria

- Verificar administrador.
- Ler diagnostico local.
- Ler performance atual.
- Ler catalogo Advanced allowlistado.
- Verificar dependencias gamer no cache e no Windows.
- Mapear limpeza segura.
- Mapear inicializacao.
- Mapear processos e protecoes gamer.

### Componentes gamer

- Instalar somente pacotes VC++/DirectX ja verificados no cache.
- Pular pacotes ja instalados localmente.
- Bloquear pacotes sem URL oficial, hash ou assinatura aprovados.
- Nunca instalar Build Tools, Visual Studio Installer, Windows SDK ou Windows App Runtime como dependencia gamer.

### Limpeza

- Aplicar apenas itens marcados como seguros pela Clean Engine.
- Usar quarentena/manifesto quando a engine suportar.
- Preservar Downloads, Desktop, Documentos, Imagens e Videos.

### Inicializacao

- Desativar somente itens ativos, alto impacto, controlaveis e permitidos pela Startup Engine.
- Preservar antivirus, drivers, audio, GPU, Steam, Discord e anti-cheats quando classificados como essenciais.

### Performance e Windows

- Detectar Economia de energia ativa e trocar para Alto desempenho.
- Ativar Game Mode.
- Desativar GameDVR.
- Desativar Xbox Game Bar/captura profunda quando allowlistado.
- Aplicar visual gamer minimo.
- Desativar transparencia, animacoes e sombras conforme engine.
- Desativar hibernacao.
- Remover atraso de inicializacao.
- Ajustar ID de publicidade, experiencias personalizadas, consumer features, historico de atividades, localizacao e Recall do usuario.
- Limpar cache DNS.
- Executar DISM de analise/limpeza/verificacao allowlistada.
- Ajustar servicos seguros para manual quando allowlistado.
- Aplicar DNS escolhido pelo usuario.

### Processos

- Fechar somente processos seguros sugeridos pela Gamer Engine.
- Preservar jogo alvo, Steam, Discord, anti-cheat, antivirus e drivers.

## Resultado esperado

Ao final da Fase 1:

- Salvar gate local da Fase 1.
- Salvar relatorio de execucao.
- Recomendar reinicio.
- Manter o DNS escolhido na reabertura.
- Apos reinicio, liberar Fase 2 em estado ideal.

## Bloqueios conhecidos

- Build padrao continua em modo teste.
- Modo real depende de instalador/build controlado.
- Dependencias sem manifesto oficial continuam bloqueadas.
- Assinatura digital ainda depende do certificado final.
