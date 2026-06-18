# Analise iGust Windows Boost

Data: 2026-06-17

Origem analisada:

- Arquivo: `C:\Users\mchen\Downloads\iGust Windows Boost.rar`
- Senha correta: `igust`
- Extracao local: `C:\Users\mchen\AppData\Local\Temp\hermes-igust-analysis-ok`
- Metodo: analise estatica. Nenhum executavel do pacote foi rodado.

## Conteudo do pacote

Arquivos principais encontrados:

- `iGust Windows Boost.bat`: script principal, 1518 linhas.
- `debloater.bat`: removedor de apps UWP e sugestoes do Windows.
- `DnsJumper.exe`: ferramenta externa para DNS.
- `EmptyStandbyList.exe`: ferramenta externa para limpar listas de memoria.
- `Autoruns.exe`: Microsoft/Sysinternals, usado para abrir gerenciador avancado de inicializacao.
- `OpenHardwareMonitor.exe` + libs/driver: telemetria local de hardware/sensores.
- `FilterKeysSetter.exe`: ferramenta externa, sem assinatura.

Assinaturas relevantes:

- `Autoruns.exe`: assinatura valida Microsoft.
- `EmptyStandbyList.exe`: assinatura valida Wen Jia Liu.
- `OpenHardwareMonitorLib.sys`: assinatura valida Noriyuki MIYAZAKI.
- `OpenHardwareMonitor.exe`, varias DLLs e `FilterKeysSetter.exe`: sem assinatura validada localmente.
- `DnsJumper.exe`: certificado identificado como Sordum Software, mas status local veio como `UnknownError`.

## Funcoes principais do iGust

Menu principal:

- Criar ponto de restauracao.
- Otimizar Windows.
- Otimizar jogos.
- Melhorar conexao/ping.
- Liberar memoria RAM.

Otimizar Windows:

- Energia: cria/ativa plano de alto desempenho/ultimate.
- Visual: desativa transparencia, animacoes e efeitos.
- Apps em segundo plano: reduz background apps e rastreio.
- Servicos: desativa alguns servicos como erro/telemetria/biometria/spooler.
- GameBar/GameDVR: desativa captura/overlay Xbox em varios pontos.
- Xbox total: remove/desativa Xbox e servicos Xbox, com opcao de reverter parcialmente.
- Relatorios de erro e telemetria.
- Hibernacao.
- Compressao de memoria: desativa/ativa via `Disable-MMAgent`/`Enable-MMAgent`.
- Indexacao/Search/Cortana.
- Prefetch/Superfetch/SysMain.
- Prioridade CPU/GPU via `MMCSS`.
- Prioridade foreground via `Win32PrioritySeparation`.
- Isolamento de nucleo/VBS/Hyper-V via registro e `bcdedit`.
- Debloater UWP.
- Fechar/iniciar Explorer.
- Limpar cache do Windows.
- Verificar/reparar arquivos do Windows.
- Reiniciar PC.

Otimizar jogos:

- Lista grande de jogos.
- Para cada jogo, aplica `Image File Execution Options\<jogo.exe>\PerfOptions\CpuPriorityClass=3`.
- Cobre jogos como Fortnite, GTA V, FiveM, CS2, Minecraft, Valorant, LoL, Warzone, Apex, Roblox, Battlefield, PUBG, Cyberpunk, RDR2, Rust, Tarkov, Marvel Rivals etc.

Rede/Ping:

- `ipconfig /flushdns`
- `ipconfig /release`
- `ipconfig /renew`
- Abre `DnsJumper.exe`.

RAM:

- Executa `EmptyStandbyList.exe workingsets`
- Executa `EmptyStandbyList.exe modifiedpagelist`
- Executa `EmptyStandbyList.exe standbylist`

Debloater:

- Remove UWP por PowerShell: Cortana, OfficeHub, Store, Xbox, Photos, Phone, People, Music, Messaging, Maps, Groove, GetStarted, Calendar, Calculator, Alarms, 3D Builder, Camera, News, OneDrive, FeedbackHub, Mail, Outlook, QuickAssist, To Do, Solitaire, Weather.
- Desativa sugestoes/anuncios/Copilot via registro.

## O que o Hermes ja cobre

Ja existe no Hermes como motor real ou catalogo allowlistado:

- DNS com provedores: Cloudflare, Google, OpenDNS, Quad9, AdGuard.
- Flush DNS.
- Winsock reset e reset de pilha IP.
- Game Mode ON.
- GameDVR OFF.
- Visual gamer minimo.
- Transparencia OFF.
- Animacoes OFF.
- Sombras visuais OFF.
- Plano Alto Desempenho/Equilibrado/Economia.
- Hibernacao OFF.
- Startup delay OFF.
- Advertising ID OFF.
- Tailored experiences OFF.
- Consumer features OFF.
- Activity History OFF.
- Location tracking OFF.
- Recall user OFF.
- DISM AnalyzeComponentStore.
- DISM StartComponentCleanup.
- DISM check NetFx3.
- DISM check DirectPlay.
- DISM enable DirectPlay.
- DiagTrack em manual.
- MapsBroker em manual.
- Limpeza segura.
- Inicializacao/alto impacto.
- Processo gamer com preservacao de jogo/Discord/Steam.
- Fate Trigger como preset prioritario Steam/UE5.
- GPU high performance para Fate Trigger mapeado.
- Relatorio de execucao com meta de 150 acoes.
- Botao 1 e Botao 2 com gate e recomendacao de reinicio.

## O que ainda falta no Hermes

Itens de alto valor que o iGust tem ou sugere e o Hermes ainda deve evoluir:

1. Sensor/hardware em tempo real estilo OpenHardwareMonitor.
   - Temperatura real, clock, uso, voltagem e sensores.
   - Hoje o Hermes ainda mostra alguns sensores como indisponiveis.

2. Prioridade por jogo via IFEO PerfOptions.
   - O Hermes ja tem selecao de jogo/Fate Trigger, mas ainda deve aplicar prioridade por executavel alvo.
   - Prioridade maxima: Fate Trigger/UE5.

3. Perfil MMCSS gamer.
   - `SystemResponsiveness`, `GPU Priority`, `Priority`, `Scheduling Category`, `SFIO Priority`.
   - Deve ficar no perfil Gamer/Avancado, nao no Dashboard.

4. Limpeza de memoria standby list.
   - iGust usa `EmptyStandbyList.exe`.
   - Hermes pode implementar como acao opcional: "Liberar memoria agora", sem prometer milagre e sem rodar em loop.

5. Modo "Autoruns interno".
   - Nao precisamos embutir Autoruns.
   - Vale criar uma tela Hermes de inicializacao avancada inspirada: Run keys, Startup folder, tarefas agendadas, servicos, impacto e reversao.

6. Dependencias gamer.
   - VC++ Redistributables e DirectX Runtime ainda estao como planejados no catalogo.
   - Alto interesse para um produto gamer real, mas precisa instalador controlado, hash conhecido e UI clara.

7. Debloater seletivo.
   - O iGust remove muitos apps de forma agressiva.
   - Hermes deve oferecer isso como "Limpeza de apps opcionais", com lista, impacto, restauracao e nunca no fluxo padrao.

8. VBS/Core Isolation/Hyper-V.
   - iGust desativa VBS/Hyper-V.
   - Hermes deve detectar e recomendar por perfil, mas aplicar somente em Avancado/Extremo com confirmacao, pois pode afetar WSL, BlueStacks, virtualizacao e seguranca.

9. Explorer restart.
   - Interessante como etapa final para aplicar visual/registro sem reiniciar tudo.
   - Deve ter UI propria: "Reiniciar Explorer agora".

10. Rede fase 2.
    - O Hermes ja tem DNS, flush DNS, Winsock e IP reset.
    - Pode adicionar `ipconfig /release` e `/renew` como acao opcional, pois derruba a conexao temporariamente.

## O que nao recomendo como padrao

Nao colocar no Botao 1/2 sem perfil/confirmacao:

- Remover Microsoft Store.
- Remover Calculator, Photos, Camera e apps basicos.
- Desativar Spooler globalmente.
- Desativar WSearch/SysMain para todo mundo.
- Desativar Hyper-V/VBS automaticamente.
- Remover Xbox/Game Bar totalmente, porque pode quebrar Game Pass, capturas e recursos de jogos.
- Aplicar `bcdedit` sem tela de impacto.
- Rodar `ipconfig /release` sem avisar que a internet pode cair por alguns segundos.

## Prioridade recomendada para o Hermes

Ordem sugerida:

1. Fate Trigger priority engine:
   - Detectar Steam install.
   - Detectar executavel UE5.
   - Aplicar IFEO `PerfOptions\CpuPriorityClass=3`.
   - Aplicar GPU high performance.

2. MMCSS Gamer Pack:
   - `SystemResponsiveness=0`.
   - `GPU Priority=8`.
   - `Priority=6`.
   - `Scheduling Category=High`.
   - `SFIO Priority=High`.

3. Hardware Monitor:
   - Temperatura/clock/uso com fallback WMI quando sensor nao existir.
   - Deixar claro quando indisponivel.

4. Memory Cleaner opcional:
   - Uma acao manual "Liberar memoria".
   - Registrar no relatorio como transiente.

5. Dependencias gamer:
   - VC++ 2005-2022 x86/x64.
   - DirectX End-User Runtime.
   - Hash/assinatura/check local antes de instalar.

6. Debloater seletivo:
   - Tela de apps removiveis.
   - Nunca usar "remover todos" como padrao.

Conclusao:

O iGust e um BAT robusto com varias acoes classicas de otimizador gamer. O Hermes ja cobre uma parte relevante com arquitetura melhor: Tauri, allowlist, relatorio, fases, Fate Trigger, DNS, performance e comandos DISM. O maior ganho agora nao e copiar o BAT inteiro; e transformar os melhores blocos em motores Hermes reais, com foco em Fate Trigger, MMCSS gamer, sensores, memoria standby e dependencias gamer.
