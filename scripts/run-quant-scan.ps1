param(
  [ValidateSet("v1", "v2", "broad", "swe", "all")]
  [string]$Mode = "v2",
  [string]$SourceDir = $PSScriptRoot,
  [string]$NodePath = "",
  [switch]$Publish
)
$ErrorActionPreference = "Stop"
if (-not $NodePath) {
  $pathNode = Get-Command node -ErrorAction SilentlyContinue
  if (-not $pathNode) { throw "Install Node.js 18+ or pass -NodePath." }
  $NodePath = $pathNode.Source
}
$entryPoint = Join-Path $SourceDir "run-quant-scan.mjs"
$scanArguments = @($entryPoint, "--mode=$Mode")
if ($Publish) { $scanArguments += "--publish" }
& $NodePath @scanArguments
exit $LASTEXITCODE
