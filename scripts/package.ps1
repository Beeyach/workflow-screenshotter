# Builds the Chrome Web Store upload zip: only the files the extension needs.
# Run: powershell -File scripts\package.ps1
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json
$version = $manifest.version
$dist = Join-Path $root "dist"
$zipPath = Join-Path $dist "bloomwired-workflow-screenshotter-$version.zip"

if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Ship only what the extension loads — no docs, tests, scripts, or git history.
$files = @("manifest.json")
foreach ($dir in "src", "popup", "icons") {
  Get-ChildItem (Join-Path $root $dir) -File -Recurse | ForEach-Object {
    $files += $_.FullName.Substring($root.Length + 1)
  }
}

# Written entry-by-entry rather than with Compress-Archive: that cmdlet stores
# Windows "\" separators, which the zip spec forbids and Chrome cannot resolve,
# so the manifest's "src/content.js" references would not be found.
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, "Create")
try {
  foreach ($rel in $files) {
    $entryName = $rel -replace "\\", "/"
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, (Join-Path $root $rel), $entryName, "Optimal") | Out-Null
  }
} finally {
  $zip.Dispose()
}

$sizeKb = [Math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Output "packaged v$version -> $zipPath ($sizeKb KB, $($files.Count) files)"
