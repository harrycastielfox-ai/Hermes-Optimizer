param(
  [switch]$AllowInstallSmoke,
  [switch]$ImportPfx,
  [switch]$BuildSigned,
  [switch]$RegenerateReleaseCandidate,
  [switch]$AllowNoGo
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root ".release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runRoot = Join-Path $releaseDir "public-release-pipeline-$timestamp"
$logsRoot = Join-Path $runRoot "logs"
New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null

$steps = New-Object System.Collections.Generic.List[object]
$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

if ($BuildSigned -and -not $RegenerateReleaseCandidate) {
  throw "Pipeline publico bloqueado: use -RegenerateReleaseCandidate junto com -BuildSigned para empacotar e validar os instaladores assinados."
}

if ($AllowInstallSmoke -and -not $RegenerateReleaseCandidate) {
  throw "Pipeline publico bloqueado: use -RegenerateReleaseCandidate junto com -AllowInstallSmoke para testar o RC atual."
}

function Invoke-PipelineStep {
  param(
    [string]$Name,
    [string]$FilePath,
    [string[]]$ArgumentList,
    [switch]$AllowFailure
  )

  $safeName = $Name -replace "[^a-zA-Z0-9_.-]", "-"
  $stdoutPath = Join-Path $logsRoot "$safeName.stdout.log"
  $stderrPath = Join-Path $logsRoot "$safeName.stderr.log"
  $startedAt = Get-Date

  Write-Host ""
  Write-Host "== $Name ==" -ForegroundColor Cyan
  Write-Host ("{0} {1}" -f $FilePath, ($ArgumentList -join " "))

  $process = Start-Process `
    -FilePath $FilePath `
    -ArgumentList $ArgumentList `
    -WorkingDirectory $root `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -NoNewWindow `
    -Wait `
    -PassThru

  $endedAt = Get-Date
  $exitCode = [int]$process.ExitCode
  $step = [pscustomobject]@{
    name = $Name
    command = ("{0} {1}" -f $FilePath, ($ArgumentList -join " "))
    startedAt = $startedAt.ToString("o")
    endedAt = $endedAt.ToString("o")
    durationSeconds = [math]::Round(($endedAt - $startedAt).TotalSeconds, 3)
    exitCode = $exitCode
    allowFailure = [bool]$AllowFailure
    stdout = $stdoutPath
    stderr = $stderrPath
  }
  $steps.Add($step)

  if ($exitCode -ne 0) {
    $message = "Etapa '$Name' terminou com exit code $exitCode."
    if ($AllowFailure) {
      $warnings.Add($message)
      Write-Host $message -ForegroundColor Yellow
    } else {
      $failures.Add($message)
      throw "$message Logs: $stdoutPath / $stderrPath"
    }
  }
}

function Read-JsonOrNull {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

try {
  Invoke-PipelineStep -Name "01-lint" -FilePath "npm.cmd" -ArgumentList @("run", "lint")
  Invoke-PipelineStep -Name "02-typescript" -FilePath "npx.cmd" -ArgumentList @("tsc", "--noEmit")
  Invoke-PipelineStep -Name "03-release-gates" -FilePath "npm.cmd" -ArgumentList @("run", "verify:release-gates")

  if ($AllowInstallSmoke) {
    $warnings.Add("Install smoke real sera executado depois do build/RC atual para validar o pacote certo.")
  } else {
    $warnings.Add("Install smoke real nao sera executado. Use -AllowInstallSmoke em GitHub Actions/VM/maquina descartavel elevada.")
  }

  if ($ImportPfx) {
    Invoke-PipelineStep -Name "04-signing-import-pfx" -FilePath "npm.cmd" -ArgumentList @("run", "release:signing:import-pfx")
  } elseif ($BuildSigned -and -not [string]::IsNullOrWhiteSpace($env:HERMES_SIGNING_PFX_BASE64)) {
    Invoke-PipelineStep -Name "04-signing-import-pfx-auto" -FilePath "npm.cmd" -ArgumentList @("run", "release:signing:import-pfx")
  } else {
    $warnings.Add("Importacao de PFX nao foi executada. Use -ImportPfx ou configure HERMES_CERT_THUMBPRINT antes do build assinado.")
  }

  Invoke-PipelineStep -Name "05-signing-candidates" -FilePath "npm.cmd" -ArgumentList @("run", "release:signing:certs")
  Invoke-PipelineStep -Name "06-signing-preflight-before-build" -FilePath "npm.cmd" -ArgumentList @("run", "release:signing:preflight")
  Invoke-PipelineStep -Name "07-signing-handoff" -FilePath "npm.cmd" -ArgumentList @("run", "release:signing:handoff")

  if ($BuildSigned) {
    Invoke-PipelineStep -Name "08-build-real-signed" -FilePath "npm.cmd" -ArgumentList @("run", "build:windows:real:signed")
  } else {
    $warnings.Add("Build real assinado nao foi executado. Use -BuildSigned somente quando o certificado Code Signing estiver configurado.")
  }

  if ($RegenerateReleaseCandidate) {
    Invoke-PipelineStep -Name "09-release-internal-current-build" -FilePath "npm.cmd" -ArgumentList @("run", "release:internal")
  } else {
    $warnings.Add("Release candidate/sessao QA nao foram regenerados. Use -RegenerateReleaseCandidate quando quiser iniciar um RC novo.")
  }

  Invoke-PipelineStep -Name "10-qa-drop-auto-safe-current-rc" -FilePath "npm.cmd" -ArgumentList @("run", "qa:manual:drop:auto")

  if ($AllowInstallSmoke) {
    Invoke-PipelineStep -Name "11-qa-drop-auto-install-smoke-current-rc" -FilePath "npm.cmd" -ArgumentList @("run", "qa:manual:drop:auto:install")
  }

  Invoke-PipelineStep -Name "12-qa-manual-sync-current-rc" -FilePath "npm.cmd" -ArgumentList @("run", "qa:manual:sync")
  Invoke-PipelineStep -Name "13-signing-preflight-after-build" -FilePath "npm.cmd" -ArgumentList @("run", "release:signing:preflight")
  Invoke-PipelineStep -Name "14-release-launch-plan" -FilePath "npm.cmd" -ArgumentList @("run", "release:launch-plan")
  Invoke-PipelineStep -Name "15-release-status" -FilePath "npm.cmd" -ArgumentList @("run", "release:status")
  Invoke-PipelineStep -Name "16-public-release-verify" -FilePath "npm.cmd" -ArgumentList @("run", "release:public:verify") -AllowFailure:$AllowNoGo
} catch {
  if ($failures.Count -eq 0) {
    $failures.Add($_.Exception.Message)
  }
}

$releaseStatus = Read-JsonOrNull -Path (Join-Path $releaseDir "release-status.json")
$publicReady = Read-JsonOrNull -Path (Join-Path $releaseDir "public-release-ready.json")
$launchPlan = Read-JsonOrNull -Path (Join-Path $releaseDir "release-launch-plan.json")

$status = if ($failures.Count -eq 0 -and $publicReady -and [string]$publicReady.status -eq "GO") {
  "GO"
} elseif ($failures.Count -eq 0 -and $AllowNoGo) {
  "NO-GO-EXPECTED"
} else {
  "FAILED"
}

$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  status = $status
  allowInstallSmoke = [bool]$AllowInstallSmoke
  importPfx = [bool]$ImportPfx
  buildSigned = [bool]$BuildSigned
  regenerateReleaseCandidate = [bool]$RegenerateReleaseCandidate
  allowNoGo = [bool]$AllowNoGo
  runRoot = $runRoot
  logsRoot = $logsRoot
  releaseStatus = if ($releaseStatus) { [string]$releaseStatus.overallStatus } else { $null }
  publicReady = if ($publicReady) { [string]$publicReady.status } else { $null }
  nextOperationalCommand = if ($launchPlan) { [string]$launchPlan.nextOperationalCommand } else { $null }
  blockers = if ($releaseStatus) { @($releaseStatus.blockers) } else { @() }
  publicFailures = if ($publicReady) { @($publicReady.failures) } else { @() }
  warnings = @($warnings)
  failures = @($failures)
  steps = @($steps.ToArray())
}

$jsonPath = Join-Path $runRoot "public-release-pipeline-result.json"
$mdPath = Join-Path $runRoot "public-release-pipeline-result.md"
$latestJsonPath = Join-Path $releaseDir "public-release-pipeline-latest.json"
$latestMdPath = Join-Path $releaseDir "public-release-pipeline-latest.md"

$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $latestJsonPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# Hermes Public Release Pipeline")
$markdown.Add("")
$markdown.Add("- Status: **$($report.status)**")
$markdown.Add("- Release status: $($report.releaseStatus)")
$markdown.Add("- Public ready: $($report.publicReady)")
$markdown.Add("- Install smoke real: $($report.allowInstallSmoke)")
$markdown.Add("- Importar PFX: $($report.importPfx)")
$markdown.Add("- Build assinado: $($report.buildSigned)")
$markdown.Add("- Regenerar RC/sessao QA: $($report.regenerateReleaseCandidate)")
$markdown.Add("- Proximo comando: ``$($report.nextOperationalCommand)``")
$markdown.Add("- Logs: ``$logsRoot``")
$markdown.Add("")
$markdown.Add("## Etapas")
$markdown.Add("")
foreach ($step in @($report.steps)) {
  $markdown.Add("- $($step.name): exit $($step.exitCode) em $($step.durationSeconds)s")
}
$markdown.Add("")
$markdown.Add("## Bloqueios")
$markdown.Add("")
if (@($report.blockers).Count -gt 0) {
  foreach ($blocker in @($report.blockers)) {
    $markdown.Add("- $blocker")
  }
} else {
  $markdown.Add("- Nenhum bloqueio em release-status.")
}
$markdown.Add("")
$markdown.Add("## Falhas do Gate Publico")
$markdown.Add("")
if (@($report.publicFailures).Count -gt 0) {
  foreach ($failure in @($report.publicFailures)) {
    $markdown.Add("- $failure")
  }
} else {
  $markdown.Add("- Nenhuma falha do gate publico.")
}
$markdown.Add("")
$markdown.Add("## Avisos")
$markdown.Add("")
if (@($report.warnings).Count -gt 0) {
  foreach ($warning in @($report.warnings)) {
    $markdown.Add("- $warning")
  }
} else {
  $markdown.Add("- Nenhum aviso.")
}
$markdown.Add("")
$markdown.Add("## Falhas do Pipeline")
$markdown.Add("")
if (@($report.failures).Count -gt 0) {
  foreach ($failure in @($report.failures)) {
    $markdown.Add("- $failure")
  }
} else {
  $markdown.Add("- Nenhuma falha operacional.")
}

$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8
$markdown | Set-Content -LiteralPath $latestMdPath -Encoding UTF8

Write-Host ""
Write-Host "Public release pipeline: $($report.status)"
Write-Host "Resultado: $jsonPath"
Write-Host "Resumo: $mdPath"
Write-Host "Resumo latest: $latestMdPath"

if ($report.status -eq "FAILED") {
  exit 1
}

if ($report.status -ne "GO" -and -not $AllowNoGo) {
  exit 1
}
