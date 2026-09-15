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
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($data)) {
        $data = $_POST;
    }

    $url = isset($data['publicBaseUrl']) ? trim((string) $data['publicBaseUrl']) : '';
    if ($url !== '') {
        if (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $url)) {
            jsonResponse(['ok' => false, 'error' => 'Invalid public URL.'], 400);
        }
        $url = rtrim($url, '/');
    }

    if (!saveSiteConfig(['publicBaseUrl' => $url])) {
        jsonResponse(['ok' => false, 'error' => 'Failed to save site configuration.'], 500);
    }

    jsonResponse([
        'ok' => true,
        'publicBaseUrl' => $url,
        'resolvedUrl' => getPublicBaseUrl(),
        'message' => 'Site configuration saved.',
    ]);
} catch (Throwable $e) {
    jsonResponse(['ok' => false, 'error' => 'Server error while saving site config.'], 500);
}
