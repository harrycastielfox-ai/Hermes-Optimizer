param(
  [string]$SessionPath,
  [string]$SessionsRoot
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($SessionsRoot)) {
  $SessionsRoot = Join-Path $root ".release\manual-qa"
}

if ([string]::IsNullOrWhiteSpace($SessionPath)) {
  if (-not (Test-Path -LiteralPath $SessionsRoot -PathType Container)) {
    throw "Pasta de sessoes de QA manual nao encontrada: $SessionsRoot"
  }

  $latestSession = Get-ChildItem -LiteralPath $SessionsRoot -Directory |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestSession) {
    throw "Nenhuma sessao de QA manual encontrada. Execute npm run qa:manual:new primeiro."
  }

  $SessionPath = $latestSession.FullName
}

if (-not (Test-Path -LiteralPath $SessionPath -PathType Container)) {
  throw "Sessao de QA manual nao encontrada: $SessionPath"
}

function Read-JsonOrNull {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

$sessionJsonPath = Join-Path $SessionPath "manual-qa-session.json"
$verificationPath = Join-Path $SessionPath "manual-qa-verification.json"
$doctorPath = Join-Path $SessionPath "manual-qa-package-doctor.json"
$releaseStatusPath = Join-Path $root ".release\release-status.json"
$signingHandoffPath = Join-Path $root ".release\signing-handoff.json"
$latestManualQaDropPath = Join-Path $root ".release\manual-qa-test-drop\latest-manual-qa-test-drop.json"

$session = Read-JsonOrNull -Path $sessionJsonPath
if (-not $session) {
  throw "Arquivo manual-qa-session.json ausente: $sessionJsonPath"
}

$verification = Read-JsonOrNull -Path $verificationPath
$doctor = Read-JsonOrNull -Path $doctorPath
$releaseStatus = Read-JsonOrNull -Path $releaseStatusPath
$signingHandoff = Read-JsonOrNull -Path $signingHandoffPath
$latestManualQaDrop = Read-JsonOrNull -Path $latestManualQaDropPath

$items = @($session.items)
$p0Pending = @($items | Where-Object { $_.priority -eq "P0" -and $_.status -eq "pending" })
$p0BlockedOrFailed = @($items | Where-Object { $_.priority -eq "P0" -and $_.status -in @("blocked", "failed") })
$p1Pending = @($items | Where-Object { $_.priority -eq "P1" -and $_.status -eq "pending" })
$protectedInstallItems = @($items | Where-Object { $_.id -in @("install-nsis", "install-msi", "authenticode") })
$bulkEligiblePending = @(
  $items | Where-Object {
    $_.status -eq "pending" -and
    $_.id -notin @("install-nsis", "install-msi", "authenticode") -and
    -not [string]::IsNullOrWhiteSpace([string]$_.evidence)
  }
)
$needsHumanEvidence = @(
  $items | Where-Object {
    $_.status -eq "pending" -and
    $_.id -notin @("install-nsis", "install-msi", "authenticode") -and
    [string]::IsNullOrWhiteSpace([string]$_.evidence)
  }
)

$latestPortableZip = Get-ChildItem -LiteralPath $SessionPath -File -Filter "hermes-manual-qa-portable-*.zip" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$receiveCommand = if ($latestManualQaDrop -and -not [string]::IsNullOrWhiteSpace([string]$latestManualQaDrop.receiveCommand)) {
  [string]$latestManualQaDrop.receiveCommand
} else {
  'npm run qa:manual:receive -- -EvidenceDropPath "C:\Temp\HermesQA"'
}
$bulkCommand = 'npm run qa:manual:bulk -- -Group all-non-protected -Status passed -Evidence "Validado em maquina limpa/VM: janela, rotas, scroll, Dashboard leitura, Botoes 1/2 em modo teste, Fate Trigger, Defender, Manutencao e Configuracoes" -ConfirmBulkPass'

$plan = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  sessionPath = (Resolve-Path $SessionPath).Path
  candidateName = [string]$session.candidateName
  manualDecision = if ($verification) { [string]$verification.manualDecision } else { $null }
  publicDecision = if ($releaseStatus -and ($releaseStatus.PSObject.Properties.Name -contains "publicDecision")) {
    [string]$releaseStatus.publicDecision
  } elseif ($releaseStatus -and ($releaseStatus.PSObject.Properties.Name -contains "publicStatus")) {
    [string]$releaseStatus.publicStatus
  } else {
    [string]$session.publicDecision
  }
  p0Pending = $p0Pending.Count
  p0BlockedOrFailed = $p0BlockedOrFailed.Count
  p1Pending = $p1Pending.Count
  bulkEligiblePending = $bulkEligiblePending.Count
  needsHumanEvidence = $needsHumanEvidence.Count
  protectedInstallItems = @($protectedInstallItems | ForEach-Object { $_.id })
  latestPortableZip = if ($latestPortableZip) { $latestPortableZip.FullName } else { $null }
  latestManualQaDrop = if ($latestManualQaDrop) { [string]$latestManualQaDrop.dropRoot } else { $null }
  latestManualQaDropRunner = if ($latestManualQaDrop) { [string]$latestManualQaDrop.vmRunnerPath } else { $null }
  latestManualQaDropSandbox = if ($latestManualQaDrop) { [string]$latestManualQaDrop.sandboxPath } else { $null }
  packageDoctorStatus = if ($doctor) { [string]$doctor.status } else { $null }
  signingReadyToSign = if ($signingHandoff) { [bool]$signingHandoff.readyToSign } else { $false }
  commands = [pscustomobject]@{
    makePortable = "npm run qa:manual:portable"
    makeDrop = "npm run qa:manual:drop"
    verifyDrop = "npm run qa:manual:drop:verify"
    runQuickPassInsideVm = 'powershell -NoProfile -ExecutionPolicy Bypass -File .\RODAR-QA-HERMES-NA-VM.ps1 -QuickPassAll'
    packageDoctor = "npm run qa:manual:doctor"
    checkVmReturn = "npm run qa:manual:drop:check"
    receiveVm = $receiveCommand
    bulkPassAfterVm = $bulkCommand
    signingHandoff = "npm run release:signing:handoff"
    releaseStatus = "npm run release:status"
  }
}

$jsonPath = Join-Path $SessionPath "manual-qa-action-plan.json"
$mdPath = Join-Path $SessionPath "manual-qa-action-plan.md"
$plan | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Manual QA - Plano de Acao")
$markdown.Add("")
$markdown.Add("- Sessao: $($plan.candidateName)")
$markdown.Add("- Caminho: $($plan.sessionPath)")
$markdown.Add("- Decisao manual: $(if ($plan.manualDecision) { $plan.manualDecision } else { 'sem resumo atualizado' })")
$markdown.Add("- Decisao publica: $(if ($plan.publicDecision) { $plan.publicDecision } else { 'sem status atualizado' })")
$markdown.Add("- P0 pendentes: $($plan.p0Pending)")
$markdown.Add("- P0 bloqueados/falhos: $($plan.p0BlockedOrFailed)")
$markdown.Add("- P1 pendentes: $($plan.p1Pending)")
$markdown.Add("- Itens com precheck tecnico prontos para validacao em lote: $($plan.bulkEligiblePending)")
$markdown.Add("- Itens que ainda precisam evidencia humana direta: $($plan.needsHumanEvidence)")
$markdown.Add("")
$markdown.Add("## Ordem recomendada")
$markdown.Add("")
$markdown.Add("1. Rodar ou enviar o drop QA para VM/maquina limpa.")
$markdown.Add("2. Executar smoke de instalacao e o coletor manual. Se tudo visual/fluxos passou, usar o quick pass.")
$markdown.Add("3. Trazer a pasta `HermesQA` de volta e consolidar.")
$markdown.Add("4. Se o conjunto visual/fluxo estiver aprovado, fechar os itens nao protegidos em lote.")
$markdown.Add("5. Resolver Authenticode com certificado Code Signing real.")
$markdown.Add("")
$markdown.Add("## Comandos")
$markdown.Add("")
$markdown.Add("~~~powershell")
$markdown.Add($plan.commands.makeDrop)
$markdown.Add($plan.commands.verifyDrop)
$markdown.Add("# Dentro da VM/Sandbox, apos instalar e validar visual/fluxos:")
$markdown.Add($plan.commands.runQuickPassInsideVm)
$markdown.Add($plan.commands.makePortable)
$markdown.Add($plan.commands.packageDoctor)
$markdown.Add($plan.commands.checkVmReturn)
$markdown.Add($plan.commands.receiveVm)
$markdown.Add($plan.commands.bulkPassAfterVm)
$markdown.Add($plan.commands.signingHandoff)
$markdown.Add($plan.commands.releaseStatus)
$markdown.Add("~~~")
$markdown.Add("")
$markdown.Add("## Pacote QA atual")
$markdown.Add("")
if ($plan.latestManualQaDrop) {
  $markdown.Add("- Drop: $($plan.latestManualQaDrop)")
  $markdown.Add("- Runner VM: $($plan.latestManualQaDropRunner)")
  $markdown.Add("- Windows Sandbox: $($plan.latestManualQaDropSandbox)")
  $markdown.Add("- Receber evidencias: $($plan.commands.receiveVm)")
  $markdown.Add("")
}
if ($latestPortableZip) {
  $markdown.Add("- ZIP: $($latestPortableZip.FullName)")
  $markdown.Add("- SHA256: $((Get-FileHash -LiteralPath $latestPortableZip.FullName -Algorithm SHA256).Hash)")
} else {
  $markdown.Add("- Nenhum ZIP portatil encontrado. Rode `npm run qa:manual:portable`.")
}
$markdown.Add("")
$markdown.Add("## Pendencias P0")
$markdown.Add("")
foreach ($item in $p0Pending) {
  $hasEvidence = -not [string]::IsNullOrWhiteSpace([string]$item.evidence)
  $markdown.Add("- PENDING [$($item.id)] $($item.title) | Evidencia tecnica: $(if ($hasEvidence) { 'sim' } else { 'nao' })")
}
foreach ($item in $p0BlockedOrFailed) {
  $markdown.Add("- $($item.status.ToUpperInvariant()) [$($item.id)] $($item.title) | $($item.evidence)")
}
$markdown.Add("")
$markdown.Add("## Itens protegidos")
$markdown.Add("")
$markdown.Add('- `install-nsis`, `install-msi` e `authenticode` nao devem ser aprovados por lote comum.')
$markdown.Add('- `install-nsis` e `install-msi` precisam do `RUN-INSTALL-SMOKE.ps1` em VM/maquina limpa.')
$markdown.Add('- `authenticode` precisa de MSI/NSIS com assinatura `Valid`.')

$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host "Plano de QA manual gerado:"
Write-Host "- $mdPath"
Write-Host "- $jsonPath"
Write-Host "P0 pendentes: $($plan.p0Pending)"
Write-Host "P0 bloqueados/falhos: $($plan.p0BlockedOrFailed)"
Write-Host "Comando principal depois da VM:"
Write-Host $receiveCommand
