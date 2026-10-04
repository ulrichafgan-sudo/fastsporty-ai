Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\WILLIAM\Desktop\application de paris sportive\LOGO\5ff1f252-ee63-48bd-b5e8-faf6f4353739.png"
$destDir = "c:\Users\WILLIAM\Desktop\application de paris sportive\public\images\logo"

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height
Write-Output "New Logo Dimensions: $w x $h"

# Create a 32-bit ARGB bitmap
$out = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Background color sampling
$c00 = $src.GetPixel(0, 0)
Write-Output "Corner pixel: R=$($c00.R) G=$($c00.G) B=$($c00.B)"

$minX = $w
$maxX = 0
$minY = $h
$maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $src.GetPixel($x, $y)
        
        # Check if pixel is background (near pure white #FFFFFF or very light gray)
        $diff = [Math]::Max([Math]::Abs($p.R - $p.G), [Math]::Max([Math]::Abs($p.R - $p.B), [Math]::Abs($p.G - $p.B)))
        $isBg = ($p.R -ge 245 -and $p.G -ge 245 -and $p.B -ge 245 -and $diff -le 10)
        
        if ($isBg) {
            $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            # Slight anti-aliasing near white threshold
            $brightness = ($p.R + $p.G + $p.B) / 3.0
            $alpha = 255
            if ($brightness -gt 240 -and $diff -le 10) {
                $alpha = [int]([Math]::Max(0, [Math]::Min(255, (245 - $brightness) * 51)))
            }
            $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
            
            if ($alpha -gt 30) {
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
Write-Output "Cropped Size: $cropW x $cropH"

$pad = 16
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

$finalBmp.Save("$destDir\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$finalBmp.Save("c:\Users\WILLIAM\Desktop\application de paris sportive\public\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
Copy-Item $srcPath "$destDir\logo-hd-source.png" -Force

$g.Dispose()
$finalBmp.Dispose()
$out.Dispose()
$src.Dispose()

Write-Output "Done! New HD transparent logo saved to public/logo.png"
