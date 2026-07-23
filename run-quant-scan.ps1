param(
  [ValidateSet("v1", "v2", "broad", "swe", "all")]
  [string]$Mode = "all",
  [string]$SourceDir = $PSScriptRoot,
  [string]$NodePath = ""
)

$ErrorActionPreference = "Stop"

function Resolve-Node {
  param([string]$RequestedNodePath)

  if ($RequestedNodePath -and (Test-Path -LiteralPath $RequestedNodePath)) {
    return (Resolve-Path -LiteralPath $RequestedNodePath).Path
  }

  $codexNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path -LiteralPath $codexNode) {
    return $codexNode
  }

  $pathNode = Get-Command node -ErrorAction SilentlyContinue
  if ($pathNode) {
    return $pathNode.Source
  }

  throw "Node.js was not found. Install Node 18+ or pass -NodePath C:\path\to\node.exe."
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "SourceDir not found: $SourceDir"
}

$SourceDir = (Resolve-Path -LiteralPath $SourceDir).Path
$NodePath = Resolve-Node -RequestedNodePath $NodePath

$stateDir = Join-Path $SourceDir ".scan-state"
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $SourceDir "reports") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $SourceDir "data") | Out-Null

$previousRunFile = Join-Path $stateDir "previous_scan_time.txt"
$currentRunStartedAt = (Get-Date).ToUniversalTime().ToString("o")
if (Test-Path -LiteralPath (Join-Path $SourceDir "data/us_financial_services_internship_scan_raw.json")) {
  $raw = Get-Content -LiteralPath (Join-Path $SourceDir "data/us_financial_services_internship_scan_raw.json") -Raw | ConvertFrom-Json
  if ($raw.searchedAt) {
    Set-Content -LiteralPath $previousRunFile -Value $raw.searchedAt -NoNewline
  }
} elseif (-not (Test-Path -LiteralPath $previousRunFile)) {
  Set-Content -LiteralPath $previousRunFile -Value $currentRunStartedAt -NoNewline
}

Push-Location -LiteralPath $SourceDir
try {
  Write-Host "Using Node: $NodePath"
  Write-Host "Running scan mode: $Mode"

  if ($Mode -eq "v1" -or $Mode -eq "v2" -or $Mode -eq "broad" -or $Mode -eq "all") {
    & $NodePath ".\scan_quant_internships.mjs"
  }

  if ($Mode -eq "v2" -or $Mode -eq "all") {
    & $NodePath ".\expand_quant_internship_search.mjs"
  }

  if ($Mode -eq "broad" -or $Mode -eq "all") {
    & $NodePath ".\expand_us_financial_services_search.mjs"
  }

  if ($Mode -eq "swe" -or $Mode -eq "all") {
    & $NodePath ".\scan_swe_2027_internships.mjs"
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Done. Generated CSV, Markdown, raw JSON, and audit JSON files in:"
Write-Host $SourceDir
Write-Host "Previous run timestamp saved at:"
Write-Host $previousRunFile
