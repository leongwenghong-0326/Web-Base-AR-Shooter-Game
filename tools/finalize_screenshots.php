<?php
declare(strict_types=1);

$shotDir = __DIR__ . '/../docs/screenshots';

// Ensure AR play is real PNG
$ar = $shotDir . '/03-ar-play.png';
$data = file_get_contents($ar);
if ($data !== false && strncmp($data, "\xFF\xD8\xFF", 3) === 0) {
    $im = imagecreatefromstring($data);
    if ($im) {
        imagepng($im, $ar);
        imagedestroy($im);
        echo "converted 03-ar-play.jpg data to png\n";
    }
} else {
    echo "03-ar-play already png or unknown\n";
}

// Frame target picture into 06-target.png
$src = __DIR__ . '/../assets/targets/picture.jpg';
if (!is_file($src)) {
    fwrite(STDERR, "missing picture.jpg\n");
    exit(1);
}
$im = imagecreatefromjpeg($src);
$w = imagesx($im);
$h = imagesy($im);
$maxW = 960;
$maxH = 540;
$scale = min($maxW / $w, $maxH / $h, 1.0);
$nw = (int) ($w * $scale);
$nh = (int) ($h * $scale);
$out = imagecreatetruecolor($maxW, $maxH);
$bg = imagecolorallocate($out, 11, 15, 20);
imagefilledrectangle($out, 0, 0, $maxW, $maxH, $bg);
$x = (int) (($maxW - $nw) / 2);
$y = (int) (($maxH - $nh) / 2);
imagecopyresampled($out, $im, $x, $y, 0, 0, $nw, $nh, $w, $h);
$gold = imagecolorallocate($out, 212, 175, 55);
imagerectangle($out, 12, 12, $maxW - 13, $maxH - 13, $gold);
imagepng($out, $shotDir . '/06-target.png');
imagedestroy($im);
imagedestroy($out);
echo "wrote 06-target.png from picture.jpg ({$w}x{$h})\n";
