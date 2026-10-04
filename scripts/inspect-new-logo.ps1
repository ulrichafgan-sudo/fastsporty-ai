Add-Type -AssemblyName System.Drawing

$filePath = "c:\Users\WILLIAM\Desktop\application de paris sportive\logos\ChatGPT Image 4 oct. 2026, 08_20_49.png"
$bmp = [System.Drawing.Bitmap]::FromFile($filePath)
Write-Output "Size: $($bmp.Width) x $($bmp.Height)"
$c0 = $bmp.GetPixel(0, 0)
Write-Output "Pixel(0,0): A=$($c0.A) R=$($c0.R) G=$($c0.G) B=$($c0.B)"
$cMid = $bmp.GetPixel([int]($bmp.Width * 0.7), [int]($bmp.Height * 0.5))
Write-Output "Pixel(Sporty): A=$($cMid.A) R=$($cMid.R) G=$($cMid.G) B=$($cMid.B)"
$bmp.Dispose()
