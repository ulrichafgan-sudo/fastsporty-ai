Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\WILLIAM\Desktop\application de paris sportive\public\images\logo\logo-original.jpg"
$destDir = "c:\Users\WILLIAM\Desktop\application de paris sportive\public\images\logo"

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# Create a 32-bit ARGB bitmap
$out = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$minX = $w
$maxX = 0
$minY = $h
$maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $src.GetPixel($x, $y)
        
        # Background is near RGB(247, 247, 247)
        # Difference between R, G, B channels
        $diff = [Math]::Max([Math]::Abs($p.R - $p.G), [Math]::Max([Math]::Abs($p.R - $p.B), [Math]::Abs($p.G - $p.B)))
        $isBg = ($p.R -gt 240 -and $p.G -gt 240 -and $p.B -gt 240 -and $diff -lt 12)
        
        if ($isBg) {
            $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $p.R, $p.G, $p.B))
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "Clean Bounding box: X=$minX to $maxX, Y=$minY to $maxY"
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
Write-Output "Clean Cropped Size: $cropW x $cropH"

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

$finalBmp.Save("$destDir\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$finalBmp.Save("c:\Users\WILLIAM\Desktop\application de paris sportive\public\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$finalBmp.Dispose()
$out.Dispose()
$src.Dispose()

Write-Output "Clean razor-sharp transparent logo saved!"
