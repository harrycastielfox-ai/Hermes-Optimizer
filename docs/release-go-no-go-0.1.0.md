# Hermes Optimizer 0.1.0 - Plano Final GO/NO-GO

Data base: 2026-07-02

## Veredito Atual

**NO-GO para release publico 0.1.0.**

O Hermes esta tecnicamente avançado e com QA automatizado em modo seguro. O smoke real elevado de instalacao ja validou NSIS/MSI, mas o release publico final continua bloqueado enquanto Authenticode nao estiver `Valid` nos dois instaladores publicos.

Release interno/beta controlado continua permitido apenas com aviso claro de `NO-GO publico`, modo seguro ativo e sem promessa comercial de release final.

Decisao atual de produto/release: a compra/configuracao de certificado Code Signing esta adiada. A politica registrada em `docs/release-policy.json` mantem `publicSignedRelease=blocked`, `codeSigning.status=deferred` e `allowUnsignedPublicRelease=false`. Portanto, o proximo caminho pratico e beta interno controlado, nao release publico.

## P0 Finais Ainda Abertos

### P0: install-nsis

- Arquivo relacionado: `.release/manual-qa/manual-qa-0.1.0-20260702-142413-aligned/manual-qa-session.json`
- Item: `install-nsis`
- Status atual: `passed`
- Risco para o usuario: o instalador `.exe` pode falhar, nao abrir o app instalado, quebrar UAC, criar atalho incorreto ou instalar em caminho inesperado.
- Criterio exato de aceite: NSIS instala em Windows limpo/descartavel, Hermes abre pelo atalho normal, processo/janela sao detectaveis, e o smoke registra `passed=true`.
- Comando de validacao:

```powershell
npm run qa:manual:drop:auto
npm run qa:manual:drop:auto:install
npm run qa:manual:drop:check
npm run qa:manual:drop:receive
npm run qa:manual:status
```

- Observacao: o `qa:manual:drop:auto` local roda em `HERMES_QA_AUTO_SAFE=1`, portanto bloqueia instalacao/GUI no host. Para fechar este P0 de forma publica, use `npm run qa:manual:drop:auto:install` somente em GitHub Actions/VM/maquina descartavel elevada.
- Bloqueia release publico: **nao, ja fechado no QA atual**.
- Bloqueia release interno: **nao**, desde que marcado como beta/QA interno.

### P0: install-msi

- Arquivo relacionado: `.release/manual-qa/manual-qa-0.1.0-20260702-142413-aligned/manual-qa-session.json`
- Item: `install-msi`
- Status atual: `passed`
- Risco para o usuario: o instalador `.msi` pode falhar silenciosamente, nao registrar o produto corretamente no Windows Installer, deixar upgrade/uninstall quebrado ou nao abrir o app apos instalacao.
- Criterio exato de aceite: MSI instala em Windows limpo/descartavel, registra entrada de instalacao/desinstalacao, Hermes abre pelo atalho normal, processo/janela sao detectaveis, e o smoke registra `passed=true`.
- Comando de validacao:

```powershell
npm run qa:manual:drop:auto
npm run qa:manual:drop:auto:install
npm run qa:manual:drop:check
npm run qa:manual:drop:receive
npm run qa:manual:status
```

- Observacao: assim como o NSIS, o auto local nao deve instalar no notebook do desenvolvedor. A evidencia final precisa vir de ambiente descartavel/limpo usando `qa:manual:drop:auto:install`.
- Bloqueia release publico: **nao, ja fechado no QA atual**.
- Bloqueia release interno: **nao**, desde que marcado como beta/QA interno.

### P0: authenticode

- Arquivo relacionado: `.release/manual-qa/manual-qa-0.1.0-20260702-142413-aligned/manual-qa-session.json`
- Item: `authenticode`
- Status atual: `blocked`
- Evidencia atual: `NSIS Authenticode=NotSigned; MSI Authenticode=NotSigned`
- Risco para o usuario: Windows SmartScreen/Defender pode bloquear ou assustar o usuario; tambem aumenta risco de distribuicao indevida de build alterado ou nao confiavel.
- Criterio exato de aceite: MSI e NSIS com `Get-AuthenticodeSignature` retornando `Valid`, assinados pelo certificado oficial esperado e gerados pelo build real assinado.
- Comando de validacao:

```powershell
npm run release:signing:certs
npm run release:signing:import-pfx
npm run release:signing:preflight
npm run release:signing:doctor
npm run release:public:pipeline:signed
npm run release:public:pipeline:signed:install
npm run release:public:package
npm run release:status
```

- Bloqueia release publico: **sim**.
- Bloqueia release interno: **nao**, se o pacote for explicitamente interno/QA e nao distribuido como release final.

## Estado do Authenticode

### Onde o gate verifica assinatura

- `scripts/signing-preflight.ps1`: le `HERMES_CERT_THUMBPRINT`, procura certificado em `Cert:\CurrentUser\My` e `Cert:\LocalMachine\My`, verifica chave privada, vencimento e assinatura atual dos instaladores.
- `scripts/build-windows-controlled.ps1`: quando chamado com `-Signed`, exige certificado, gera configuracao temporaria de assinatura, executa `npx tauri build` e depois bloqueia se MSI/NSIS nao estiverem `Valid` ou se o thumbprint for diferente do esperado.
- `.github/workflows/release-windows-signed.yml`: workflow manual para importar PFX via secrets, gerar MSI/NSIS assinados em `windows-latest`, rodar `release:public:verify` e publicar instaladores/evidencias como artifact.
- `scripts/verify-manual-qa-session.ps1`: marca `authenticode` como bloqueio publico quando instaladores nao estao `Valid`.
- `scripts/release-status.ps1`: consolida `unsignedInstallerCount`, bloqueios de certificado e `NO-GO`.

### Erro ou ausencia que mantem NO-GO

- `HERMES_CERT_THUMBPRINT` nao definido.
- Nenhum certificado Code Signing pronto com chave privada.
- Instaladores NSIS/MSI com Authenticode `NotSigned`.
- `qa-latest.json` ainda marca `releaseReady=false` porque assinatura valida nao existe.

### Criterio para passar

- Certificado Code Signing instalado no Windows Certificate Store.
- Certificado com chave privada, EKU de Code Signing e dentro da validade.
- `npm run release:public:pipeline:signed` concluindo sem erro.
- `npm run release:public:pipeline:signed:install` concluindo sem erro em VM/runner elevado.
- `npm run release:public:package` gerando `.release/public/<pacote>` com MSI/NSIS assinados.
- `Get-AuthenticodeSignature` dos instaladores NSIS e MSI retornando `Valid`.
- Thumbprint do assinante igual ao `HERMES_CERT_THUMBPRINT` configurado.

### Como evitar publicacao acidental sem assinatura

- Usar `npm run release:public:pipeline` como esteira final estrita antes de publicar.
- Usar `npm run release:public:pipeline:preview` apenas para acompanhar o estado enquanto o projeto ainda esta `NO-GO`.
- Enquanto `docs/release-policy.json` mantiver Code Signing como `deferred`, usar `npm run release:beta` como proximo passo operacional.
- Publicar somente artefatos gerados por `npm run release:public:pipeline:signed` ou `npm run release:public:pipeline:signed:install`.
- Gerar a pasta final com `npm run release:public:package` e publicar somente os instaladores dentro dela.
- Manter `release:status` como gate antes de qualquer upload publico.
- Rodar `npm run release:public:verify` antes de qualquer publicacao publica.
- Bloquear release publico quando `unsignedInstallerCount > 0`.
- Usar o documento `docs/relatorio-interno-release-0.1.0.md` e este documento como fontes de decisao.
- Nunca promover pacotes de `.release/candidates` para publico quando `publicDecision` for `NO-GO`.

## Estado do QA

### `qa:manual:drop:auto` local

- Status: implementado e passando localmente.
- Comando: `npm run qa:manual:drop:auto`
- Comando com install real em runner/VM: `npm run qa:manual:drop:auto:install`
- Evidencia: `.release/manual-qa-test-drop/results/auto-*/manual-qa-drop-auto-result.md`
- Comportamento: gera drop, ZIP, SHA256, extrai em pasta temporaria limpa, roda `RODAR-QA-HERMES-NA-VM.ps1 -QuickPassAll`, copia `HermesQA` de volta, roda `drop:check` e `drop:receive`.
- Limite proposital: usa `HERMES_QA_AUTO_SAFE=1`, entao bloqueia install smoke/GUI para nao alterar o Windows do host.
- Modo opt-in: `qa:manual:drop:auto:install` remove o bloqueio de install smoke, exige runner/PowerShell elevado e deve ser usado apenas em GitHub Actions manual, VM limpa ou maquina descartavel.

### GitHub Actions `qa-windows-drop.yml`

- Arquivo: `.github/workflows/qa-windows-drop.yml`
- Runner: `windows-latest`
- Triggers: `workflow_dispatch`, `pull_request`, push em `main`
- Input manual: `run_install_smoke=true` executa `qa:manual:drop:auto:install` no runner descartavel.
- Etapas: `npm ci`, lint, TypeScript, release gates, `qa:manual:drop:auto`, `release:status`, `git diff --check`
- Objetivo: validar o drop em Windows efemero sem depender do notebook do desenvolvedor.

### Artifacts gerados

- `hermes-qa-windows-drop-results`: logs, relatorios do auto drop, status de release e resumos de QA.
- `hermes-qa-windows-drop-zip`: ZIP do drop, `.sha256` e manifesto do pacote.

### Diferenca entre QA safe mode e instalacao real

- QA safe mode valida empacotamento, SHA256, runner, coleta de evidencia rapida e consolidacao sem abrir GUI nem instalar no host.
- Instalacao real valida NSIS/MSI, UAC, registro no Windows, atalhos, abertura do app instalado e desinstalacao.
- No estado atual, `install-nsis` e `install-msi` ja foram fechados por smoke real elevado e alinhados ao RC atual por SHA256 identico.

## Tabela Final

| Gate | Status | Evidencia | Bloqueia release publico? |
|---|---|---|---|
| QA tecnico automatizado | PASSOU | `npm run verify:release-gates`, `npm run lint`, `npx tsc --noEmit` | Nao |
| QA drop auto local | PASSOU | `.release/manual-qa-test-drop/results/auto-*/manual-qa-drop-auto-result.md` | Nao sozinho |
| QA Windows GitHub Actions | PREPARADO | `.github/workflows/qa-windows-drop.yml` | Nao sozinho |
| Install smoke real opt-in | PASSOU no QA atual; repetir no RC assinado final | `npm run qa:manual:drop:auto:install` / `npm run release:public:pipeline:signed:install` | Sim para o RC final |
| install-nsis | PASSOU | `manual-qa-session.json`, item `install-nsis` | Nao |
| install-msi | PASSOU | `manual-qa-session.json`, item `install-msi` | Nao |
| Authenticode NSIS/MSI | BLOQUEADO | `NSIS Authenticode=NotSigned; MSI Authenticode=NotSigned` | Sim |
| Certificado Code Signing | BLOQUEADO | `HERMES_CERT_THUMBPRINT nao definido` | Sim |
| Politica Code Signing | ADIADO | `docs/release-policy.json` | Sim para publico, nao para beta interno |
| Gate de publicacao publica | PREPARADO | `npm run release:public:verify` | Sim |
| Pacote publico final | PREPARADO/BLOQUEADO ate GO | `npm run release:public:package` | Sim |
| Release status final | NO-GO | `.release/release-status.json` | Sim |
