<?php
declare(strict_types=1);

require_once __DIR__ . '/api/site_lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? '')) !== 'POST') {
    jsonResponse(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

try {
    if (!isset($_FILES['target'])) {
        jsonResponse(['ok' => false, 'error' => 'No target image provided.'], 400);
    }

    $result = processTargetUpload($_FILES['target']);
    if (!$result['ok']) {
        jsonResponse(['ok' => false, 'error' => $result['error'] ?? 'Upload failed.'], 400);
    }

    jsonResponse([
        'ok' => true,
        'path' => $result['path'] ?? 'assets/targets/picture.jpg',
        'url' => targetImageUrl(),
        'mindExists' => targetMindExists(),
        'message' => 'Target image saved. Please compile the target before playing.',
    ]);
} catch (Throwable $e) {
    jsonResponse(['ok' => false, 'error' => 'Server error while uploading target.'], 500);
}
