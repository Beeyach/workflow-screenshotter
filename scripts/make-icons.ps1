# Generates icons/icon{16,32,48,128}.png in Bloomwired brand colors:
# ink rounded square, mauve camera glyph, blush "bloom" flash dot.
# Run: powershell -File scripts\make-icons.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root "icons"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# Brand palette (keep in sync with src/brand.js)
$INK   = [System.Drawing.Color]::FromArgb(255, 20, 20, 28)    # #14141c
$PLUM  = [System.Drawing.Color]::FromArgb(255, 94, 62, 88)    # #5e3e58
$MAUVE = [System.Drawing.Color]::FromArgb(255, 180, 142, 173) # #b48ead
$BLUSH = [System.Drawing.Color]::FromArgb(255, 245, 227, 227) # #f5e3e3

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

$size = 128
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background: ink -> plum diagonal gradient
$bgRect = New-Object System.Drawing.Rectangle(4, 4, 120, 120)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $INK, $PLUM, 35.0)
$bgPath = New-RoundedPath 4 4 120 120 28
$g.FillPath($bgBrush, $bgPath)

$mauveBrush = New-Object System.Drawing.SolidBrush($MAUVE)
$blushBrush = New-Object System.Drawing.SolidBrush($BLUSH)

# Camera viewfinder bump + body, in mauve
$notch = New-RoundedPath 46 30 36 18 6
$g.FillPath($mauveBrush, $notch)
$body = New-RoundedPath 22 40 84 58 12
$g.FillPath($mauveBrush, $body)

# Lens: ink ring cut out of the body, blush centre (the "bloom" dot)
$lensOuter = New-Object System.Drawing.Drawing2D.GraphicsPath
$lensOuter.AddEllipse(45, 50, 38, 38)
$g.FillPath($bgBrush, $lensOuter)
$lensInner = New-Object System.Drawing.Drawing2D.GraphicsPath
$lensInner.AddEllipse(53, 58, 22, 22)
$g.FillPath($blushBrush, $lensInner)

# Flash dot
$g.FillEllipse($blushBrush, 92, 47, 8, 8)

$g.Dispose()
$bmp.Save((Join-Path $outDir "icon128.png"), [System.Drawing.Imaging.ImageFormat]::Png)

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
