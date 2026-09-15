<?php
declare(strict_types=1);

$dir = __DIR__ . '/../docs/screenshots';
if (!is_dir($dir)) {
    mkdir($dir, 0775, true);
}

function makeShot(string $path, string $title, string $subtitle): void
{
    $w = 960;
    $h = 540;
    $im = imagecreatetruecolor($w, $h);
    $bg = imagecolorallocate($im, 11, 15, 20);
    $gold = imagecolorallocate($im, 212, 175, 55);
    $text = imagecolorallocate($im, 230, 236, 242);
    $muted = imagecolorallocate($im, 140, 155, 170);
    imagefilledrectangle($im, 0, 0, $w, $h, $bg);
    imagerectangle($im, 24, 24, $w - 25, $h - 25, $gold);
    $font = 5;
    imagestring($im, $font, (int) (($w - strlen($title) * 9) / 2), 220, $title, $gold);
    imagestring($im, $font, (int) (($w - strlen($subtitle) * 9) / 2), 260, $subtitle, $muted);
    imagestring($im, $font, 40, $h - 60, 'Replace with a real screenshot', $text);
    imagepng($im, $path);
    imagedestroy($im);
    echo "wrote {$path}\n";
}

$shots = [
    '01-home.png' => ['HOME', 'QR + instructions'],
    '02-game-start.png' => ['START AR', 'Camera gate'],
    '03-ar-play.png' => ['AR PLAY', 'HUD + enemy + weapon'],
    '04-models.png' => ['MODELS', 'Enemy / weapon picker'],
    '05-compile.png' => ['COMPILE', 'Target image + MindAR'],
    '06-target.png' => ['TARGET', 'Printed / on-screen marker'],
];

foreach ($shots as $file => [$title, $subtitle]) {
    makeShot($dir . '/' . $file, $title, $subtitle);
}

file_put_contents(
    $dir . '/README.md',
    <<<'MD'
# Screenshots

Replace these placeholder PNGs with real captures from the project:

| File | Capture this |
| --- | --- |
| `01-home.png` | Home page with QR and Start Game |
| `02-game-start.png` | Game start gate (Start AR button) |
| `03-ar-play.png` | Live AR play (HUD, enemy, gun, Fire/Reload) |
| `04-models.png` | Models page (enemy/weapon selection) |
| `05-compile.png` | Compile Target page |
| `06-target.png` | The target image printed or on a second screen |

Tips: use a phone screenshot for AR play; keep images under ~1 MB each.
MD
);

echo "done\n";
