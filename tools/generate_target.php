<?php
declare(strict_types=1);

$w = 1024;
$h = 1024;
$im = imagecreatetruecolor($w, $h);
$bg = imagecolorallocate($im, 12, 18, 28);
$gold = imagecolorallocate($im, 212, 175, 55);
$white = imagecolorallocate($im, 240, 240, 240);
$red = imagecolorallocate($im, 180, 40, 40);
$cyan = imagecolorallocate($im, 40, 180, 200);
$grid = imagecolorallocate($im, 30, 40, 55);

imagefilledrectangle($im, 0, 0, $w, $h, $bg);

for ($i = 0; $i < $w; $i += 64) {
    imageline($im, $i, 0, $i, $h, $grid);
}
for ($j = 0; $j < $h; $j += 64) {
    imageline($im, 0, $j, $w, $j, $grid);
}

imagesetthickness($im, 14);
imagerectangle($im, 40, 40, $w - 40, $h - 40, $gold);
imagesetthickness($im, 6);
imagerectangle($im, 80, 80, $w - 80, $h - 80, $cyan);

$marks = [[120, 120], [$w - 220, 120], [120, $h - 220], [$w - 220, $h - 220]];
foreach ($marks as [$x, $y]) {
    imagefilledrectangle($im, $x, $y, $x + 100, $y + 18, $red);
    imagefilledrectangle($im, $x, $y, $x + 18, $y + 100, $red);
}

imagefilledellipse($im, 512, 480, 280, 280, $gold);
imagefilledellipse($im, 512, 480, 200, 200, $bg);
imagefilledrectangle($im, 420, 450, 604, 510, $white);
imagestring($im, 5, 455, 560, 'AR TARGET', $gold);
imagestring($im, 5, 430, 600, 'SCAN TO PLAY', $white);

$seed = 42;
for ($n = 0; $n < 48; $n++) {
    $seed = (1103515245 * $seed + 12345) & 0x7fffffff;
    $x = 140 + ($seed % 700);
    $seed = (1103515245 * $seed + 12345) & 0x7fffffff;
    $y = 140 + ($seed % 700);
    $seed = (1103515245 * $seed + 12345) & 0x7fffffff;
    $s = 20 + ($seed % 40);
    $c = ($n % 3 === 0) ? $gold : (($n % 3 === 1) ? $cyan : $red);
    if ($x > 150 && $x < 850 && $y > 150 && $y < 850) {
        if (abs($x - 512) < 160 && abs($y - 480) < 160) {
            continue;
        }
        imagefilledrectangle($im, $x, $y, $x + $s, $y + $s, $c);
    }
}

$out = dirname(__DIR__) . '/assets/targets/picture.jpg';
imagejpeg($im, $out, 92);
imagedestroy($im);
echo 'Wrote ' . $out . ' (' . filesize($out) . " bytes)\n";
