Add-Type -AssemblyName System.Drawing

$filePath = "c:\Users\WILLIAM\Desktop\application de paris sportive\logos\ChatGPT Image 4 oct. 2026, 08_20_49.png"
$bmp = [System.Drawing.Bitmap]::FromFile($filePath)
$w = $bmp.Width
$h = $bmp.Height

$minX = $w
$maxX = 0
$minY = $h
$maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "Alpha Content Bounding Box: X=$minX to $maxX, Y=$minY to $maxY"
$contentW = $maxX - $minX + 1
$contentH = $maxY - $minY + 1
Write-Output "Content size: $contentW x $contentH"

# Sample pixel inside content
$sampleP = $bmp.GetPixel([int]($minX + $contentW * 0.75), [int]($minY + $contentH * 0.5))
Write-Output "Inside pixel: A=$($sampleP.A) R=$($sampleP.R) G=$($sampleP.G) B=$($sampleP.B)"

# Now crop tightly to content with small padding
$pad = 10
$croppedW = $contentW + ($pad * 2)
$croppedH = $contentH + ($pad * 2)

$croppedBmp = New-Object System.Drawing.Bitmap($croppedW, $croppedH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($croppedBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $contentW, $contentH)
$destRect = New-Object System.Drawing.Rectangle($pad, $pad, $contentW, $contentH)
$g.DrawImage($bmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# Save to public/logo.png and public/images/logo/logo.png
$croppedBmp.Save("c:\Users\WILLIAM\Desktop\application de paris sportive\public\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$croppedBmp.Save("c:\Users\WILLIAM\Desktop\application de paris sportive\public\images\logo\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Also save exact uncropped source
Copy-Item $filePath "c:\Users\WILLIAM\Desktop\application de paris sportive\public\images\logo\chatgpt-logo-raw.png" -Force

$g.Dispose()
$croppedBmp.Dispose()
$bmp.Dispose()

Write-Output "Successfully cropped and saved the new logo from logos folder!"
