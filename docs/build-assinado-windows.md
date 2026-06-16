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

O script gera uma configuracao temporaria em `.release/` e chama:

```powershell
npx tauri build --bundles msi,nsis --config .release/tauri.windows.signing.generated.json
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

## Bloqueio

Sem certificado real, qualquer build produzido continua sendo build interno/nao assinado e nao deve virar release publica oficial.
