Add-Type -AssemblyName System.Drawing

$logoDir = "c:\Users\WILLIAM\Desktop\application de paris sportive\LOGO"
$destDir = "c:\Users\WILLIAM\Desktop\application de paris sportive\public\images\logo"
$publicRoot = "c:\Users\WILLIAM\Desktop\application de paris sportive\public"

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

# Find image file in LOGO
$imgFile = Get-ChildItem -Path $logoDir -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png|webp)$' } | Select-Object -First 1

if (-not $imgFile) {
    Write-Error "No image file found in $logoDir"
    exit 1
}

Write-Output "Found logo file: $($imgFile.FullName)"

# Copy raw source to destDir
Copy-Item $imgFile.FullName "$destDir\source-logo$($imgFile.Extension)" -Force

# Read bitmap
$src = [System.Drawing.Bitmap]::FromFile($imgFile.FullName)
$w = $src.Width
$h = $src.Height
Write-Output "Image size: $w x $h"

# Sample 4 corners for background color
$c0 = $src.GetPixel(2, 2)
$c1 = $src.GetPixel($w - 3, 2)
$c2 = $src.GetPixel(2, $h - 3)
$c3 = $src.GetPixel($w - 3, $h - 3)

$bgR = [int](($c0.R + $c1.R + $c2.R + $c3.R) / 4)
$bgG = [int](($c0.G + $c1.G + $c2.G + $c3.G) / 4)
$bgB = [int](($c0.B + $c1.B + $c2.B + $c3.B) / 4)
Write-Output "Sampled Background Color: R=$bgR G=$bgG B=$bgB"

# Create ARGB output bitmap
$out = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$minX = $w
$maxX = 0
$minY = $h
$maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $src.GetPixel($x, $y)
        
        # Distance to sampled background
        $dist = [Math]::Sqrt([Math]::Pow($p.R - $bgR, 2) + [Math]::Pow($p.G - $bgG, 2) + [Math]::Pow($p.B - $bgB, 2))
        
        # Color difference between channels (neutral gray/white vs colored like purple)
        $diff = [Math]::Max([Math]::Abs($p.R - $p.G), [Math]::Max([Math]::Abs($p.R - $p.B), [Math]::Abs($p.G - $p.B)))
        
        # Background threshold: close to background color and neutral
        $isBg = ($dist -lt 18 -and $diff -lt 12) -or ($p.R -gt 242 -and $p.G -gt 242 -and $p.B -gt 242 -and $diff -lt 12)
        
        if ($isBg) {
            $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            # Check edge antialiasing
            $alpha = 255
            if ($dist -ge 18 -and $dist -lt 30 -and $diff -lt 15) {
                $alpha = [int](([Math]::Min(1.0, ($dist - 18) / 12.0)) * 255)
            }
            
            $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
            
            if ($alpha -gt 40) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
}

Write-Output "Bounding box: X=$minX to $maxX, Y=$minY to $maxY"
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
Write-Output "Cropped content size: $cropW x $cropH"

# Crop with padding
$pad = 12
$finalW = $cropW + ($pad * 2)
$finalH = $cropH + ($pad * 2)

$finalBmp = New-Object System.Drawing.Bitmap($finalW, $finalH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($finalBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $cropW, $cropH)
$destRect = New-Object System.Drawing.Rectangle($pad, $pad, $cropW, $cropH)
$g.DrawImage($out, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# Save cropped transparent PNG
$finalBmp.Save("$destDir\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$finalBmp.Save("$publicRoot\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$finalBmp.Dispose()
$out.Dispose()
$src.Dispose()

Write-Output "Successfully updated public/logo.png and public/images/logo/logo.png!"
