<?php
declare(strict_types=1);

/**
 * Model configuration, GLB listing, validation, and selection helpers.
 */

const MODELS_CONFIG_PATH = __DIR__ . '/../assets/config/models.json';
const MODELS_DIR = __DIR__ . '/../assets/models';
const GLB_MAX_BYTES = 40 * 1024 * 1024;

/** Filename substrings that mark a file as a weapon candidate. */
const WEAPON_HINTS = ['weapon', 'gun', 'rifle', 'pistol', 'akm', 'fps', 'arm', 'shotgun', 'smg', 'ar-'];

/** Filename substrings that mark a file as an enemy candidate. */
const ENEMY_HINTS = ['enemy', 'orc', 'alien', 'demon', 'dragon', 'zombie', 'monster', 'creature', 'boss', 'mutant', 'frog', 'animal', 'character', 'bot', 'npc'];

/**
 * @return array{enemy: string, weapon: string, updatedAt: string}
 */
function getModelsConfig(): array
{
    $defaults = [
        'enemy' => 'random',
        'weapon' => 'random',
        'updatedAt' => gmdate('c'),
    ];
    if (!is_file(MODELS_CONFIG_PATH)) {
        return $defaults;
    }
    $raw = @file_get_contents(MODELS_CONFIG_PATH);
    if ($raw === false || $raw === '') {
        return $defaults;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return $defaults;
    }
    return [
        'enemy' => isset($data['enemy']) ? (string) $data['enemy'] : 'random',
        'weapon' => isset($data['weapon']) ? (string) $data['weapon'] : 'random',
        'updatedAt' => isset($data['updatedAt']) ? (string) $data['updatedAt'] : gmdate('c'),
    ];
}

/**
 * @param array{enemy?: string, weapon?: string} $config
 */
function saveModelsConfig(array $config): bool
{
    $dir = dirname(MODELS_CONFIG_PATH);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        return false;
    }
    $payload = [
        'enemy' => isset($config['enemy']) ? (string) $config['enemy'] : 'random',
        'weapon' => isset($config['weapon']) ? (string) $config['weapon'] : 'random',
        'updatedAt' => date('c'),
    ];
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    return @file_put_contents(MODELS_CONFIG_PATH, $json . "\n") !== false;
}

function sanitizeGlbFilename(string $name): string
{
    $name = basename(str_replace(["\0", '\\'], ['', '/'], $name));
    $name = preg_replace('/[^A-Za-z0-9._-]/', '_', $name) ?? 'model.glb';
    $name = trim($name, '._-');
    if ($name === '' || strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'glb') {
        $base = pathinfo($name, PATHINFO_FILENAME);
        $base = $base !== '' ? $base : 'model';
        $name = $base . '.glb';
    }
    if (strlen($name) > 120) {
        $name = substr($name, 0, 116) . '.glb';
    }
    return $name;
}

function isValidGlbFile(string $path): bool
{
    if (!is_file($path) || filesize($path) < 12) {
        return false;
    }
    $fh = @fopen($path, 'rb');
    if ($fh === false) {
        return false;
    }
    $magic = fread($fh, 4);
    fclose($fh);
    return $magic === 'glTF';
}

function isValidGlbUpload(string $tmpPath): bool
{
    if (!is_file($tmpPath) || filesize($tmpPath) < 12) {
        return false;
    }
    $fh = @fopen($tmpPath, 'rb');
    if ($fh === false) {
        return false;
    }
    $magic = fread($fh, 4);
    fclose($fh);
    return $magic === 'glTF';
}

/**
 * @return list<string>
 */
function listGlbFiles(): array
{
    if (!is_dir(MODELS_DIR)) {
        return [];
    }
    $files = [];
    $entries = scandir(MODELS_DIR);
    if ($entries === false) {
        return [];
    }
    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..') {
            continue;
        }
        if (strtolower(pathinfo($entry, PATHINFO_EXTENSION)) !== 'glb') {
            continue;
        }
        $full = MODELS_DIR . '/' . $entry;
        if (is_file($full) && isValidGlbFile($full)) {
            $files[] = $entry;
        }
    }
    sort($files, SORT_NATURAL | SORT_FLAG_CASE);
    return $files;
}

function filenameLooksLike(string $filename, array $hints): bool
{
    $lower = strtolower($filename);
    foreach ($hints as $hint) {
        if (str_contains($lower, strtolower($hint))) {
            return true;
        }
    }
    return false;
}

/**
 * @param list<string> $files
 * @return list<string>
 */
function getWeaponCandidates(array $files): array
{
    $weapons = array_values(array_filter($files, static fn(string $f): bool => filenameLooksLike($f, WEAPON_HINTS)));
    if (!empty($weapons)) {
        return $weapons;
    }
    // If no hint match, exclude obvious enemies
    $fallback = array_values(array_filter($files, static fn(string $f): bool => !filenameLooksLike($f, ENEMY_HINTS)));
    return !empty($fallback) ? $fallback : $files;
}

/**
 * @param list<string> $files
 * @return list<string>
 */
function getEnemyCandidates(array $files): array
{
    // Always include every non-weapon GLB so custom uploads (e.g. Frog_*.glb) appear in the Enemy list.
    // Hint matching alone hid uploads that did not contain words like "enemy" / "orc".
    $nonWeapons = array_values(array_filter(
        $files,
        static fn(string $f): bool => !filenameLooksLike($f, WEAPON_HINTS)
    ));
    if (!empty($nonWeapons)) {
        return $nonWeapons;
    }
    return $files;
}

function modelUrl(?string $filename): ?string
{
    if ($filename === null || $filename === '' || strtolower($filename) === 'random') {
        return null;
    }
    $safe = sanitizeGlbFilename($filename);
    $path = MODELS_DIR . '/' . $safe;
    if (!is_file($path) || !isValidGlbFile($path)) {
        return null;
    }
    $v = (string) filemtime($path);
    return 'assets/models/' . rawurlencode($safe) . '?v=' . rawurlencode($v);
}

/**
 * Resolve configured selection to an actual file (or null for procedural fallback).
 *
 * @param list<string> $candidates
 */
function resolveModelSelection(string $selection, array $candidates): ?string
{
    if ($selection === '' || strtolower($selection) === 'random') {
        if (empty($candidates)) {
            return null;
        }
        return $candidates[array_rand($candidates)];
    }
    $safe = sanitizeGlbFilename($selection);
    if (in_array($safe, $candidates, true) || (is_file(MODELS_DIR . '/' . $safe) && isValidGlbFile(MODELS_DIR . '/' . $safe))) {
        return $safe;
    }
    return null;
}

/**
 * @return array{
 *   ok: bool,
 *   config: array,
 *   files: list<string>,
 *   enemyRandom: bool,
 *   enemyCandidates: list<string>,
 *   enemyUrl: ?string,
 *   weaponRandom: bool,
 *   weaponCandidates: list<string>,
 *   weaponUrl: ?string
 * }
 */
function buildModelsApiPayload(): array
{
    $config = getModelsConfig();
    $files = listGlbFiles();
    $enemyCandidates = getEnemyCandidates($files);
    $weaponCandidates = getWeaponCandidates($files);

    $enemyRandom = strtolower($config['enemy']) === 'random';
    $weaponRandom = strtolower($config['weapon']) === 'random';

    $enemyResolved = resolveModelSelection($config['enemy'], $enemyCandidates);
    $weaponResolved = resolveModelSelection($config['weapon'], $weaponCandidates);

    return [
        'ok' => true,
        'config' => $config,
        'files' => $files,
        'enemyRandom' => $enemyRandom,
        'enemyCandidates' => $enemyCandidates,
        'enemyUrl' => modelUrl($enemyRandom ? null : $enemyResolved),
        'enemyFile' => $enemyResolved,
        'weaponRandom' => $weaponRandom,
        'weaponCandidates' => $weaponCandidates,
        'weaponUrl' => modelUrl($weaponRandom ? null : $weaponResolved),
        'weaponFile' => $weaponResolved,
    ];
}

/**
 * @return array{ok: bool, error?: string, filename?: string}
 */
function processGlbUpload(array $file): array
{
    if (!isset($file['error']) || (int) $file['error'] !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'Upload failed. Please try again.'];
    }
    if (!isset($file['size']) || (int) $file['size'] <= 0) {
        return ['ok' => false, 'error' => 'Empty file uploaded.'];
    }
    if ((int) $file['size'] > GLB_MAX_BYTES) {
        return ['ok' => false, 'error' => 'GLB exceeds the 40 MB limit.'];
    }
    if (!isset($file['tmp_name']) || !is_uploaded_file((string) $file['tmp_name'])) {
        return ['ok' => false, 'error' => 'Invalid upload.'];
    }

    $tmp = (string) $file['tmp_name'];
    if (!isValidGlbUpload($tmp)) {
        return ['ok' => false, 'error' => 'File is not a valid GLB (missing glTF magic).'];
    }

    $original = isset($file['name']) ? (string) $file['name'] : 'model.glb';
    $safe = sanitizeGlbFilename($original);

    if (!is_dir(MODELS_DIR) && !@mkdir(MODELS_DIR, 0755, true)) {
        return ['ok' => false, 'error' => 'Models directory is not writable.'];
    }

    $dest = MODELS_DIR . '/' . $safe;
    if (is_file($dest)) {
        $base = pathinfo($safe, PATHINFO_FILENAME);
        $safe = $base . '-' . substr(bin2hex(random_bytes(3)), 0, 6) . '.glb';
        $dest = MODELS_DIR . '/' . $safe;
    }

    if (!@move_uploaded_file($tmp, $dest)) {
        return ['ok' => false, 'error' => 'Failed to save uploaded model.'];
    }

    return ['ok' => true, 'filename' => $safe];
}
