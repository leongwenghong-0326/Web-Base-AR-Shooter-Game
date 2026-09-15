<?php
declare(strict_types=1);

require_once __DIR__ . '/models_lib.php';
require_once __DIR__ . '/site_lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

try {
    if ($method === 'GET') {
        jsonResponse(buildModelsApiPayload());
    }

    if ($method !== 'POST') {
        jsonResponse(['ok' => false, 'error' => 'Method not allowed.'], 405);
    }

    $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    $action = '';
    $body = [];

    if (str_contains(strtolower($contentType), 'application/json')) {
        $raw = file_get_contents('php://input');
        $body = is_string($raw) ? (json_decode($raw, true) ?: []) : [];
        $action = isset($body['action']) ? (string) $body['action'] : '';
    } else {
        $action = isset($_POST['action']) ? (string) $_POST['action'] : '';
        $body = $_POST;
    }

    if ($action === 'save') {
        $enemy = isset($body['enemy']) ? (string) $body['enemy'] : 'random';
        $weapon = isset($body['weapon']) ? (string) $body['weapon'] : 'random';

        $files = listGlbFiles();

        if (strtolower($enemy) !== 'random') {
            $safeEnemy = sanitizeGlbFilename($enemy);
            if (!in_array($safeEnemy, $files, true)) {
                jsonResponse(['ok' => false, 'error' => 'Selected enemy model was not found.'], 400);
            }
            $enemy = $safeEnemy;
        } else {
            $enemy = 'random';
        }

        if (strtolower($weapon) !== 'random') {
            $safeWeapon = sanitizeGlbFilename($weapon);
            if (!in_array($safeWeapon, $files, true)) {
                jsonResponse(['ok' => false, 'error' => 'Selected weapon model was not found.'], 400);
            }
            $weapon = $safeWeapon;
        } else {
            $weapon = 'random';
        }

        if (!saveModelsConfig(['enemy' => $enemy, 'weapon' => $weapon])) {
            jsonResponse(['ok' => false, 'error' => 'Failed to save model configuration.'], 500);
        }

        $payload = buildModelsApiPayload();
        $payload['message'] = 'Selection saved.';
        jsonResponse($payload);
    }

    if ($action === 'upload') {
        if (!isset($_FILES['model'])) {
            jsonResponse(['ok' => false, 'error' => 'No model file provided.'], 400);
        }
        $result = processGlbUpload($_FILES['model']);
        if (!$result['ok']) {
            jsonResponse(['ok' => false, 'error' => $result['error'] ?? 'Upload failed.'], 400);
        }
        $payload = buildModelsApiPayload();
        $payload['uploaded'] = $result['filename'] ?? null;
        $payload['message'] = 'Model uploaded successfully.';
        jsonResponse($payload);
    }

    jsonResponse(['ok' => false, 'error' => 'Unknown action.'], 400);
} catch (Throwable $e) {
    jsonResponse(['ok' => false, 'error' => 'Server error while processing models request.'], 500);
}
