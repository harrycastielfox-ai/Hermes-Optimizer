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

Para listar certificados candidatos instalados no Windows Store:

```powershell
npm run release:signing:certs
```

Para escolher um thumbprint especifico e gerar um template local em `.release/.env.signing.local.example`:

```powershell
npm run release:signing:certs -- -Thumbprint "SHA1_THUMBPRINT_DO_CERTIFICADO" -WriteEnvTemplate
```

O assistente nao instala certificados e nao assina builds. Ele apenas valida candidatos e gera evidencia em:

- `.release/signing-certificate-candidates.json`
- `.release/signing-certificate-candidates.md`

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

Antes de tentar assinar, rode o preflight:

```powershell
npm run release:signing:preflight
```

Ele grava:

- `.release/signing-preflight.json`
- `.release/signing-preflight.md`

O preflight confere thumbprint, certificado no Store, chave privada, timestamp, `signtool.exe` no PATH ou no Windows Kits e assinatura atual dos MSI/NSIS.

Quando o Windows SDK esta instalado, o Hermes tenta localizar automaticamente caminhos como:

```text
C:\Program Files (x86)\Windows Kits\10\bin\<versao>\x64\signtool.exe
```

```powershell
Get-AuthenticodeSignature "src-tauri/target/release/bundle/nsis/Hermes Optimizer_0.1.0_x64-setup.exe"
Get-AuthenticodeSignature "src-tauri/target/release/bundle/msi/Hermes Optimizer_0.1.0_x64_en-US.msi"
```

Resultado esperado: `Status` deve ser `Valid` e o certificado deve pertencer ao publicador oficial.

O script assinado tambem executa essa verificacao automaticamente ao final.

## Bloqueio

Sem certificado real, qualquer build produzido continua sendo build interno/nao assinado e nao deve virar release publica oficial.

## GitHub Actions

O workflow manual `.github/workflows/release-windows-signed.yml` prepara o caminho de release assinado em uma maquina Windows descartavel.

Secrets necessarios no GitHub:

- `HERMES_SIGNING_PFX_BASE64`: PFX do certificado Code Signing convertido para Base64.
- `HERMES_SIGNING_PFX_PASSWORD`: senha do PFX.

Execucao:

1. Abra **Actions** no GitHub.
2. Selecione **Release Windows Signed**.
3. Clique em **Run workflow**.
4. Escolha `bundles`: `all`, `nsis` ou `msi`.
5. Confirme o timestamp URL.
6. Rode o workflow.

O workflow:

- instala dependencias;
- roda lint, TypeScript e release gates;
- importa o PFX no `Cert:\CurrentUser\My`;
- define `HERMES_CERT_THUMBPRINT` automaticamente;
- roda `npm run release:signing:preflight`;
- roda `npm run build:windows:real:signed`;
- roda `npm run release:public:verify`;
- publica instaladores e evidencias como artifact `hermes-windows-signed-release`.

Se o certificado, QA P0 ou Authenticode ainda nao estiverem prontos, o workflow deve falhar. Isso e intencional para evitar publicar build nao assinado por acidente.
