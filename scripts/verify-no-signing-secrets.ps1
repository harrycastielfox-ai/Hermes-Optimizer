$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$forbiddenTrackedExtensions = @(".pfx", ".p12", ".pem", ".key")
$forbiddenPatterns = @(
  "-----BEGIN PRIVATE KEY-----",
  "-----BEGIN RSA PRIVATE KEY-----",
  "-----BEGIN ENCRYPTED PRIVATE KEY-----"
)
$safePlaceholderValues = @(
  "SENHA_DO_PFX",
  "SENHA_DO_PFX_REAL",
  "YOUR_PFX_PASSWORD",
  "PFX_PASSWORD",
  "senha-do-pfx"
)

Push-Location $root
try {
  $trackedFiles = @(& git.exe ls-files)
} finally {
  Pop-Location
}

$failures = New-Object System.Collections.Generic.List[string]

foreach ($file in $trackedFiles) {
  $extension = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
  if ($forbiddenTrackedExtensions -contains $extension) {
    $failures.Add("Arquivo sensivel rastreado pelo git: $file")
    continue
  }

  $absolutePath = Join-Path $root $file
  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    continue
  }

  $fileInfo = Get-Item -LiteralPath $absolutePath
  if ($fileInfo.Length -gt 1048576) {
    continue
  }

  $content = Get-Content -LiteralPath $absolutePath -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) {
    continue
  }

  foreach ($pattern in $forbiddenPatterns) {
    if ($content -match $pattern) {
      $failures.Add("Padrao sensivel encontrado em ${file}: $pattern")
    }
  }

  $lines = Get-Content -LiteralPath $absolutePath -ErrorAction SilentlyContinue
  foreach ($line in @($lines)) {
    if ($line -match "(HERMES_SIGNING_PFX_PASSWORD|PfxPassword)\s*=\s*['""]([^'""]+)['""]") {
      $value = [string]$Matches[2]
      $isPlaceholder = $safePlaceholderValues -contains $value -or $value -match "SENHA|PASSWORD|SECRET|EXAMPLE|PLACEHOLDER"
      $isCiExpression = $value -match "\$\{\{.*\}\}"
      if (-not $isPlaceholder -and -not $isCiExpression) {
        $failures.Add("Possivel senha real de PFX encontrada em ${file}. Use placeholder ou secret do CI.")
      }
    }
  }
}

if ($failures.Count -gt 0) {
  Write-Host "Hermes signing secret scan: FALHOU" -ForegroundColor Red
  foreach ($failure in $failures) {
    Write-Host "- $failure" -ForegroundColor Red
  }
  exit 1
}

Write-Host "Hermes signing secret scan: OK"
