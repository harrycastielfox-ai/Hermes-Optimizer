# Build Assinado Windows

Status: preparado, dependente de certificado real.

## Pre-requisitos

- Certificado de assinatura de codigo instalado no Windows Certificate Store.
- SHA1 thumbprint do certificado.
- Windows SDK ou ferramenta de assinatura disponivel para o Tauri.
- Acesso a timestamp server.

## Variaveis

```powershell
$env:HERMES_CERT_THUMBPRINT = "SHA1_THUMBPRINT_DO_CERTIFICADO"
$env:HERMES_TIMESTAMP_URL = "http://timestamp.digicert.com"
```

Se o provedor exigir RFC 3161/TSP:

```powershell
npm run build:tauri:signed -- -Tsp
```

## Comando padrao

```powershell
npm run build:tauri:signed
```

Esse comando agora delega para o build controlado oficial em modo real assinado:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-windows-controlled.ps1 -Mode real -Signed
```

O build controlado:

- valida os release gates antes de empacotar;
- exige `HERMES_CERT_THUMBPRINT`;
- procura o certificado em `Cert:\CurrentUser\My` e `Cert:\LocalMachine\My`;
- bloqueia se o certificado nao tiver chave privada;
- gera a configuracao temporaria em `.release/`;
- chama `npx tauri build --bundles msi,nsis`;
- valida Authenticode dos instaladores gerados;
- bloqueia se MSI ou NSIS nao estiverem `Valid`;
- bloqueia se a assinatura vier de thumbprint diferente do configurado.

Para assinar somente um formato:

```powershell
npm run build:tauri:signed -- -Bundles nsis
npm run build:tauri:signed -- -Bundles msi
```

## Saidas esperadas

- `src-tauri/target/release/bundle/msi/Hermes Optimizer_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Hermes Optimizer_0.1.0_x64-setup.exe`

## Verificacao

```powershell
Get-AuthenticodeSignature "src-tauri/target/release/bundle/nsis/Hermes Optimizer_0.1.0_x64-setup.exe"
Get-AuthenticodeSignature "src-tauri/target/release/bundle/msi/Hermes Optimizer_0.1.0_x64_en-US.msi"
```

Resultado esperado: `Status` deve ser `Valid` e o certificado deve pertencer ao publicador oficial.

O script assinado tambem executa essa verificacao automaticamente ao final.

## Bloqueio

Sem certificado real, qualquer build produzido continua sendo build interno/nao assinado e nao deve virar release publica oficial.
