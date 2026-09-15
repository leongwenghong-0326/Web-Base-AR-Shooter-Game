<?php
declare(strict_types=1);
foreach ([
    'Frog_by_Quaternius_-_37wofOCOzG.glb',
    'Fps_Rig_AKM_by_J-Toastie_-_U6l6wjxFhC.glb',
] as $f) {
    $p = dirname(__DIR__) . '/assets/models/' . $f;
    if (!is_file($p)) {
        echo "missing $f\n";
        continue;
    }
    $bin = file_get_contents($p);
    $jsonLen = unpack('V', substr($bin, 12, 4))[1];
    $json = substr($bin, 20, $jsonLen);
    $g = json_decode($json, true);
    echo "=== $f ===\n";
    echo 'meshes:' . count($g['meshes'] ?? []) .
        ' materials:' . count($g['materials'] ?? []) .
        ' textures:' . count($g['textures'] ?? []) .
        ' images:' . count($g['images'] ?? []) .
        ' animations:' . count($g['animations'] ?? []) . "\n";
    foreach (($g['materials'] ?? []) as $i => $m) {
        $pbr = $m['pbrMetallicRoughness'] ?? [];
        echo " mat$i: " . ($m['name'] ?? '?') .
            ' factor=' . json_encode($pbr['baseColorFactor'] ?? null) .
            ' tex=' . (isset($pbr['baseColorTexture']) ? 'yes' : 'no') . "\n";
    }
    echo 'anims: ' . implode(', ', array_map(static fn($a) => $a['name'] ?? '?', $g['animations'] ?? [])) . "\n\n";
}
