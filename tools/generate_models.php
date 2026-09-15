<?php
declare(strict_types=1);

/**
 * Minimal GLB generator (triangle mesh + optional extras).
 * Creates valid glTF 2.0 binary files without external tools.
 */

function align4(int $n): int
{
    return ($n + 3) & ~3;
}

/**
 * @param list<float> $positions  xyz triplets
 * @param list<int>   $indices
 * @param list<float> $colors     rgb triplets 0-1 (optional, same count as verts)
 */
function writeGlb(string $path, array $positions, array $indices, ?array $colors = null): void
{
    $vertexCount = intdiv(count($positions), 3);
    $indexCount = count($indices);

    $posBytes = '';
    $min = [INF, INF, INF];
    $max = [-INF, -INF, -INF];
    for ($i = 0; $i < $vertexCount; $i++) {
        $x = $positions[$i * 3];
        $y = $positions[$i * 3 + 1];
        $z = $positions[$i * 3 + 2];
        $posBytes .= pack('fff', $x, $y, $z);
        $min[0] = min($min[0], $x);
        $min[1] = min($min[1], $y);
        $min[2] = min($min[2], $z);
        $max[0] = max($max[0], $x);
        $max[1] = max($max[1], $y);
        $max[2] = max($max[2], $z);
    }

    $colBytes = '';
    if ($colors !== null) {
        for ($i = 0; $i < $vertexCount; $i++) {
            $colBytes .= pack('fff', $colors[$i * 3], $colors[$i * 3 + 1], $colors[$i * 3 + 2]);
        }
    }

    $idxBytes = '';
    foreach ($indices as $idx) {
        $idxBytes .= pack('v', $idx);
    }
    // pad indices to 4 bytes
    while (strlen($idxBytes) % 4 !== 0) {
        $idxBytes .= "\0";
    }

    $bin = $posBytes . $colBytes . $idxBytes;
    while (strlen($bin) % 4 !== 0) {
        $bin .= "\0";
    }

    $posLen = strlen($posBytes);
    $colLen = strlen($colBytes);
    $idxLen = $indexCount * 2;
    $idxByteOffset = $posLen + $colLen;

    $bufferViews = [
        [
            'buffer' => 0,
            'byteOffset' => 0,
            'byteLength' => $posLen,
            'target' => 34962,
        ],
    ];
    $attributes = ['POSITION' => 0];
    $accessors = [
        [
            'bufferView' => 0,
            'componentType' => 5126,
            'count' => $vertexCount,
            'type' => 'VEC3',
            'max' => $max,
            'min' => $min,
        ],
    ];

    $nextView = 1;
    $nextAcc = 1;
    if ($colors !== null) {
        $bufferViews[] = [
            'buffer' => 0,
            'byteOffset' => $posLen,
            'byteLength' => $colLen,
            'target' => 34962,
        ];
        $attributes['COLOR_0'] = $nextAcc;
        $accessors[] = [
            'bufferView' => $nextView,
            'componentType' => 5126,
            'count' => $vertexCount,
            'type' => 'VEC3',
        ];
        $nextView++;
        $nextAcc++;
    }

    $bufferViews[] = [
        'buffer' => 0,
        'byteOffset' => $idxByteOffset,
        'byteLength' => $idxLen,
        'target' => 34963,
    ];
    $accessors[] = [
        'bufferView' => $nextView,
        'componentType' => 5123,
        'count' => $indexCount,
        'type' => 'SCALAR',
    ];

    $gltf = [
        'asset' => ['version' => '2.0', 'generator' => 'AR-Shooter-GLB'],
        'buffers' => [['byteLength' => strlen($bin)]],
        'bufferViews' => $bufferViews,
        'accessors' => $accessors,
        'materials' => [[
            'name' => 'Mat',
            'pbrMetallicRoughness' => [
                'baseColorFactor' => [0.85, 0.75, 0.2, 1.0],
                'metallicFactor' => 0.1,
                'roughnessFactor' => 0.8,
            ],
            'doubleSided' => true,
        ]],
        'meshes' => [[
            'name' => 'Mesh',
            'primitives' => [[
                'attributes' => $attributes,
                'indices' => $nextAcc,
                'material' => 0,
                'mode' => 4,
            ]],
        ]],
        'nodes' => [['mesh' => 0, 'name' => 'Root']],
        'scenes' => [['nodes' => [0]]],
        'scene' => 0,
    ];

    $json = json_encode($gltf, JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('JSON encode failed');
    }
    $jsonPadding = (4 - (strlen($json) % 4)) % 4;
    $json .= str_repeat(' ', $jsonPadding);

    $totalLength = 12 + 8 + strlen($json) + 8 + strlen($bin);
    $out = pack('a4VV', 'glTF', 2, $totalLength);
    $out .= pack('VVa*', strlen($json), 0x4E4F534A, $json); // JSON chunk
    $out .= pack('VVa*', strlen($bin), 0x004E4942, $bin);   // BIN chunk

    if (@file_put_contents($path, $out) === false) {
        throw new RuntimeException('Failed writing ' . $path);
    }
}

function boxMesh(float $sx, float $sy, float $sz, float $ox = 0.0, float $oy = 0.0, float $oz = 0.0): array
{
    $hx = $sx / 2;
    $hy = $sy / 2;
    $hz = $sz / 2;
    $p = [
        -$hx + $ox, -$hy + $oy,  $hz + $oz,
         $hx + $ox, -$hy + $oy,  $hz + $oz,
         $hx + $ox,  $hy + $oy,  $hz + $oz,
        -$hx + $ox,  $hy + $oy,  $hz + $oz,
        -$hx + $ox, -$hy + $oy, -$hz + $oz,
         $hx + $ox, -$hy + $oy, -$hz + $oz,
         $hx + $ox,  $hy + $oy, -$hz + $oz,
        -$hx + $ox,  $hy + $oy, -$hz + $oz,
    ];
    $i = [
        0, 1, 2, 0, 2, 3,
        1, 5, 6, 1, 6, 2,
        5, 4, 7, 5, 7, 6,
        4, 0, 3, 4, 3, 7,
        3, 2, 6, 3, 6, 7,
        4, 5, 1, 4, 1, 0,
    ];
    return [$p, $i];
}

function mergeMeshes(array $meshes): array
{
    $pos = [];
    $idx = [];
    $base = 0;
    foreach ($meshes as [$p, $i]) {
        foreach ($p as $v) {
            $pos[] = $v;
        }
        $vc = intdiv(count($p), 3);
        foreach ($i as $vi) {
            $idx[] = $vi + $base;
        }
        $base += $vc;
    }
    return [$pos, $idx];
}

$dir = dirname(__DIR__) . '/assets/models';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// Enemy: orc-like humanoid blocks
[$bodyP, $bodyI] = boxMesh(0.45, 0.7, 0.35, 0, 0.55, 0);
[$headP, $headI] = boxMesh(0.32, 0.32, 0.32, 0, 1.1, 0);
[$legLP, $legLI] = boxMesh(0.16, 0.4, 0.16, -0.12, 0.2, 0);
[$legRP, $legRI] = boxMesh(0.16, 0.4, 0.16, 0.12, 0.2, 0);
[$armLP, $armLI] = boxMesh(0.14, 0.45, 0.14, -0.35, 0.6, 0);
[$armRP, $armRI] = boxMesh(0.14, 0.45, 0.14, 0.35, 0.6, 0);
[$pos, $idx] = mergeMeshes([
    [$bodyP, $bodyI], [$headP, $headI], [$legLP, $legLI], [$legRP, $legRI], [$armLP, $armLI], [$armRP, $armRI],
]);
writeGlb($dir . '/orc-enemy.glb', $pos, $idx);
echo "orc-enemy.glb\n";

// Alien enemy
[$torsoP, $torsoI] = boxMesh(0.4, 0.55, 0.3, 0, 0.6, 0);
[$domeP, $domeI] = boxMesh(0.5, 0.35, 0.45, 0, 1.05, 0);
[$leg1P, $leg1I] = boxMesh(0.12, 0.5, 0.12, -0.18, 0.25, 0.1);
[$leg2P, $leg2I] = boxMesh(0.12, 0.5, 0.12, 0.18, 0.25, 0.1);
[$leg3P, $leg3I] = boxMesh(0.12, 0.5, 0.12, 0, 0.25, -0.15);
[$pos, $idx] = mergeMeshes([
    [$torsoP, $torsoI], [$domeP, $domeI], [$leg1P, $leg1I], [$leg2P, $leg2I], [$leg3P, $leg3I],
]);
writeGlb($dir . '/alien-enemy.glb', $pos, $idx);
echo "alien-enemy.glb\n";

// Demon enemy
[$bodyP, $bodyI] = boxMesh(0.5, 0.75, 0.4, 0, 0.6, 0);
[$headP, $headI] = boxMesh(0.35, 0.28, 0.3, 0, 1.15, 0);
[$hornLP, $hornLI] = boxMesh(0.08, 0.35, 0.08, -0.18, 1.4, -0.05);
[$hornRP, $hornRI] = boxMesh(0.08, 0.35, 0.08, 0.18, 1.4, -0.05);
[$wingLP, $wingLI] = boxMesh(0.55, 0.08, 0.25, -0.55, 0.8, -0.1);
[$wingRP, $wingRI] = boxMesh(0.55, 0.08, 0.25, 0.55, 0.8, -0.1);
[$pos, $idx] = mergeMeshes([
    [$bodyP, $bodyI], [$headP, $headI], [$hornLP, $hornLI], [$hornRP, $hornRI], [$wingLP, $wingLI], [$wingRP, $wingRI],
]);
writeGlb($dir . '/demon-enemy.glb', $pos, $idx);
echo "demon-enemy.glb\n";

// FPS weapon (viewmodel-ish rifle)
[$stockP, $stockI] = boxMesh(0.12, 0.14, 0.35, 0, -0.02, 0.15);
[$bodyP, $bodyI] = boxMesh(0.1, 0.12, 0.55, 0, 0.02, -0.2);
[$barrelP, $barrelI] = boxMesh(0.05, 0.05, 0.4, 0, 0.04, -0.55);
[$magP, $magI] = boxMesh(0.06, 0.18, 0.1, 0, -0.12, -0.05);
[$gripP, $gripI] = boxMesh(0.08, 0.16, 0.1, 0, -0.14, 0.1);
[$sightP, $sightI] = boxMesh(0.04, 0.08, 0.12, 0, 0.12, -0.15);
[$pos, $idx] = mergeMeshes([
    [$stockP, $stockI], [$bodyP, $bodyI], [$barrelP, $barrelI], [$magP, $magI], [$gripP, $gripI], [$sightP, $sightI],
]);
writeGlb($dir . '/fps-akm.glb', $pos, $idx);
echo "fps-akm.glb\n";

[$bodyP, $bodyI] = boxMesh(0.09, 0.1, 0.45, 0, 0.0, -0.1);
[$barrelP, $barrelI] = boxMesh(0.04, 0.04, 0.35, 0, 0.02, -0.45);
[$gripP, $gripI] = boxMesh(0.07, 0.18, 0.09, 0, -0.12, 0.05);
[$pos, $idx] = mergeMeshes([[$bodyP, $bodyI], [$barrelP, $barrelI], [$gripP, $gripI]]);
writeGlb($dir . '/fps-rig.glb', $pos, $idx);
echo "fps-rig.glb\n";

echo "Done.\n";
