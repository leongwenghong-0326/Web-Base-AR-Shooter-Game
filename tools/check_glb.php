<?php
declare(strict_types=1);
foreach (glob(dirname(__DIR__) . '/assets/models/*.glb') as $f) {
    $h = file_get_contents($f, false, null, 0, 4);
    echo basename($f) . ' [' . $h . '] ' . filesize($f) . PHP_EOL;
}
