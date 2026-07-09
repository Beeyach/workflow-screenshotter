# Generates icons/icon{16,32,48,128}.png — purple gradient rounded square
# with a white camera glyph. Run: powershell -File scripts\make-icons.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root "icons"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# --- Draw the master 128px icon ---
$size = 128
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background: rounded square, indigo -> violet gradient
$bgRect = New-Object System.Drawing.Rectangle(4, 4, 120, 120)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $bgRect,
  [System.Drawing.Color]::FromArgb(255, 99, 102, 241),   # indigo #6366f1
  [System.Drawing.Color]::FromArgb(255, 192, 82, 245),   # violet #c052f5
  35.0
)
$bgPath = New-RoundedPath 4 4 120 120 28
$g.FillPath($bgBrush, $bgPath)

$white = [System.Drawing.Brushes]::White

# Camera top notch (viewfinder bump)
$notch = New-RoundedPath 46 30 36 18 6
$g.FillPath($white, $notch)

# Camera body
$body = New-RoundedPath 22 40 84 58 12
$g.FillPath($white, $body)

# Lens: outer ring is background gradient showing through
$lensOuter = New-Object System.Drawing.Drawing2D.GraphicsPath
$lensOuter.AddEllipse(45, 50, 38, 38)
$g.FillPath($bgBrush, $lensOuter)
$lensInner = New-Object System.Drawing.Drawing2D.GraphicsPath
$lensInner.AddEllipse(53, 58, 22, 22)
$g.FillPath($white, $lensInner)

# Flash dot
$g.FillEllipse($white, 92, 47, 8, 8)

$g.Dispose()
$bmp.Save((Join-Path $outDir "icon128.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# --- Downscale to the other sizes ---
foreach ($s in 48, 32, 16) {
  $small = New-Object System.Drawing.Bitmap($s, $s)
  $gs = [System.Drawing.Graphics]::FromImage($small)
  $gs.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gs.DrawImage($bmp, (New-Object System.Drawing.Rectangle(0, 0, $s, $s)))
  $gs.Dispose()
  $small.Save((Join-Path $outDir "icon$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $small.Dispose()
}
$bmp.Dispose()
Write-Output "icons written to $outDir"
