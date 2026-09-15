<?php
declare(strict_types=1);

require_once __DIR__ . '/api/site_lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? '')) !== 'POST') {
    jsonResponse(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

try {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        jsonResponse(['ok' => false, 'error' => 'Empty target data.'], 400);
    }

    // Reject absurd payloads (> 25 MB compiled)
    if (strlen($raw) > 25 * 1024 * 1024) {
        jsonResponse(['ok' => false, 'error' => 'Compiled target is too large.'], 400);
    }

    if (!is_dir(TARGET_DIR) && !@mkdir(TARGET_DIR, 0755, true)) {
        jsonResponse(['ok' => false, 'error' => 'Target directory is not writable.'], 500);
    }

    $path = targetMindPath();
    $bytes = @file_put_contents($path, $raw);
    if ($bytes === false) {
        jsonResponse(['ok' => false, 'error' => 'Failed to save compiled target.'], 500);
    }

    jsonResponse([
        'ok' => true,
        'bytes' => $bytes,
        'path' => 'assets/targets/' . TARGET_MIND,
        'url' => targetMindUrl(),
    ]);
} catch (Throwable $e) {
    jsonResponse(['ok' => false, 'error' => 'Server error while saving target.'], 500);
}
