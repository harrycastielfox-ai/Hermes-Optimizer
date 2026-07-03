# Teste do beta unsigned no Windows Sandbox

Este fluxo existe para testar o beta interno unsigned do Hermes sem instalar nada no Windows principal.

## Comandos

Prepare o beta/drop e o ZIP exportavel:

~~~powershell
npm run release:beta:ship
~~~

Verifique o ambiente e o drop:

~~~powershell
npm run release:beta:doctor
~~~

Prepare o arquivo do Windows Sandbox:

~~~powershell
npm run release:beta:sandbox
~~~

O comando gera `Run-Hermes-Beta-In-Sandbox.wsb` dentro do drop beta mais recente.

## Como o Sandbox funciona

- O beta drop e mapeado dentro do Sandbox como somente leitura.
- A pasta de evidencias e mapeada como gravavel em `C:\Temp\HermesQA`.
- A rede fica desabilitada por padrao.
- O Windows principal nao recebe instalacao do Hermes.
- Ao fechar o Sandbox, tudo que foi instalado dentro dele e descartado.
- Apenas a pasta de evidencias volta para o host.

## Dentro do Sandbox

O `sandbox-start.ps1` abre automaticamente:

- a pasta do beta;
- o `LEIA-ME-TESTE-BETA.md`;
- a pasta `C:\Temp\HermesQA`;
- instrucoes para salvar evidencias.

O tester deve instalar manualmente o MSI/EXE dentro do Sandbox e registrar evidencias em `C:\Temp\HermesQA`.

Nao desative Defender, SmartScreen, UAC ou seguranca do Windows.

## Se Windows Sandbox nao estiver disponivel

Verifique:

- se a edicao do Windows suporta Windows Sandbox;
- se a virtualizacao esta habilitada na BIOS/UEFI;
- se o recurso Windows Sandbox esta habilitado nos recursos opcionais.

Alternativa: use uma VM externa e rode o ZIP/drop beta dentro dela.

## Depois do teste

No host, rode:

~~~powershell
npm run release:beta:drop:check
npm run release:beta:drop:receive
~~~

O release publico continua `NO-GO` enquanto MSI/NSIS nao tiverem Authenticode valido.
