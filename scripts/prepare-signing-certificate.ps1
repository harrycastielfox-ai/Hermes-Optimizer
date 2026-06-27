param(
  [string]$Thumbprint,
  [switch]$WriteEnvTemplate
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root ".release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

function Normalize-Thumbprint {
  param([string]$Value)

  return ($Value -replace "\s", "").ToUpperInvariant()
}

function Get-CodeSigningUsage {
  param($Certificate)

  $enhancedUsages = @($Certificate.EnhancedKeyUsageList | ForEach-Object { $_.FriendlyName })
  if ($enhancedUsages.Count -eq 0) {
    return "Unknown"
  }

  if ($enhancedUsages -contains "Code Signing") {
    return "CodeSigning"
  }

  return ($enhancedUsages -join "; ")
}

function Get-SigningCandidates {
  $stores = @("Cert:\CurrentUser\My", "Cert:\LocalMachine\My")

  foreach ($store in $stores) {
    Get-ChildItem -Path $store -ErrorAction SilentlyContinue | ForEach-Object {
      $usage = Get-CodeSigningUsage -Certificate $_
      $isCodeSigning = $usage -eq "CodeSigning"
      $isExpired = $_.NotAfter -lt (Get-Date)

      [pscustomobject]@{
        store           = $store
        subject         = $_.Subject
        issuer          = $_.Issuer
        thumbprint      = Normalize-Thumbprint $_.Thumbprint
        notBefore       = $_.NotBefore.ToString("o")
        notAfter        = $_.NotAfter.ToString("o")
        hasPrivateKey   = [bool]$_.HasPrivateKey
        usage           = $usage
        isCodeSigning   = $isCodeSigning
        isExpired       = $isExpired
        readyForHermes  = ($isCodeSigning -and -not $isExpired -and [bool]$_.HasPrivateKey)
      }
    }
  }
}

$candidates = @(Get-SigningCandidates | Sort-Object readyForHermes, notAfter -Descending)
$normalizedRequestedThumbprint = if ([string]::IsNullOrWhiteSpace($Thumbprint)) {
  $null
} else {
  Normalize-Thumbprint $Thumbprint
}

$selected = if ($normalizedRequestedThumbprint) {
  $candidates | Where-Object { $_.thumbprint -eq $normalizedRequestedThumbprint } | Select-Object -First 1
} else {
  $ready = @($candidates | Where-Object { $_.readyForHermes })
  if ($ready.Count -eq 1) {
    $ready[0]
  } else {
    $null
  }
}

$blockers = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

if ($candidates.Count -eq 0) {
  $blockers.Add("Nenhum certificado encontrado em Cert:\CurrentUser\My ou Cert:\LocalMachine\My.")
}

if ($normalizedRequestedThumbprint -and -not $selected) {
  $blockers.Add("Thumbprint informado nao foi encontrado no Windows Certificate Store.")
}

if ($selected) {
  if (-not $selected.hasPrivateKey) {
    $blockers.Add("Certificado selecionado nao possui chave privada.")
  }
  if (-not $selected.isCodeSigning) {
    $blockers.Add("Certificado selecionado nao possui Enhanced Key Usage de Code Signing.")
  }
  if ($selected.isExpired) {
    $blockers.Add("Certificado selecionado esta expirado.")
  }
} else {
  $readyCount = @($candidates | Where-Object { $_.readyForHermes }).Count
  if ($readyCount -eq 0) {
    $blockers.Add("Nenhum certificado pronto para assinar encontrado. E necessario certificado Code Signing com chave privada.")
  } elseif ($readyCount -gt 1) {
    $warnings.Add("Mais de um certificado pronto encontrado. Rode este script com -Thumbprint para escolher explicitamente.")
  }
}

$envTemplatePath = Join-Path $releaseDir ".env.signing.local.example"
if ($WriteEnvTemplate -and $selected -and $blockers.Count -eq 0) {
  @"
# Hermes signing local env template.
# Revise antes de usar e nao commite valores reais.
`$env:HERMES_CERT_THUMBPRINT = "$($selected.thumbprint)"
`$env:HERMES_TIMESTAMP_URL = "http://timestamp.digicert.com"
"@ | Set-Content -LiteralPath $envTemplatePath -Encoding UTF8
}

$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  selectedThumbprint = if ($selected) { $selected.thumbprint } else { $null }
  selectedSubject = if ($selected) { $selected.subject } else { $null }
  readyToConfigure = ($selected -and $blockers.Count -eq 0)
  envTemplatePath = if ($WriteEnvTemplate -and $selected -and $blockers.Count -eq 0) { $envTemplatePath } else { $null }
  candidates = $candidates
  blockers = @($blockers)
  warnings = @($warnings)
}

$jsonPath = Join-Path $releaseDir "signing-certificate-candidates.json"
$mdPath = Join-Path $releaseDir "signing-certificate-candidates.md"
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$candidateLines = if ($candidates.Count -gt 0) {
  ($candidates | ForEach-Object {
    $status = if ($_.readyForHermes) { "READY" } else { "BLOCKED" }
    $thumbprint = $_.thumbprint
    "- $status | ``$thumbprint`` | $($_.subject) | Store=$($_.store) | PrivateKey=$($_.hasPrivateKey) | Usage=$($_.usage) | Expires=$($_.notAfter)"
  }) -join "`r`n"
} else {
  "- Nenhum certificado encontrado."
}

$blockerLines = if ($blockers.Count -gt 0) {
  ($blockers | ForEach-Object { "- $_" }) -join "`r`n"
} else {
  "- Nenhum bloqueio."
}

$warningLines = if ($warnings.Count -gt 0) {
  ($warnings | ForEach-Object { "- $_" }) -join "`r`n"
} else {
  "- Nenhum aviso."
}

$templateLine = if ($WriteEnvTemplate -and $selected -and $blockers.Count -eq 0) {
  "- Template gerado: `$envTemplatePath"
} else {
  "- Template nao gerado. Use `-WriteEnvTemplate` quando houver um certificado selecionado e pronto."
}

@"
# Hermes Signing Certificate Candidates

- Pronto para configurar: **$(if ($report.readyToConfigure) { 'SIM' } else { 'NAO' })**
- Selecionado: $(if ($selected) { "`$($selected.thumbprint) - $($selected.subject)" } else { "nenhum" })
$templateLine

## Certificados

$candidateLines

## Bloqueios

$blockerLines

## Avisos

$warningLines

## Proximo comando

~~~powershell
npm run release:signing:preflight
~~~
"@ | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host "Certificados de assinatura encontrados: $($candidates.Count)"
Write-Host "Pronto para configurar: $(if ($report.readyToConfigure) { 'SIM' } else { 'NAO' })"
if ($selected) {
  Write-Host "Selecionado: $($selected.thumbprint) | $($selected.subject)"
}
Write-Host "Evidencia: $jsonPath"
Write-Host "Resumo: $mdPath"
if ($report.envTemplatePath) {
  Write-Host "Template: $($report.envTemplatePath)"
}

if ($blockers.Count -gt 0) {
  Write-Host ""
  Write-Host "Bloqueios:" -ForegroundColor Yellow
  foreach ($blocker in $blockers) {
    Write-Host "- $blocker" -ForegroundColor Yellow
  }
}
