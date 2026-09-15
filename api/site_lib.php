<?php
declare(strict_types=1);

/**
 * Site configuration, public URL, LAN detection, and target helpers.
 */

const SITE_CONFIG_PATH = __DIR__ . '/../assets/config/site.json';
const TARGET_DIR = __DIR__ . '/../assets/targets';
const TARGET_IMAGE = 'picture.jpg';
const TARGET_MIND = 'targets.mind';
const TARGET_MAX_BYTES = 12 * 1024 * 1024;
const TARGET_MAX_DIMENSION = 1600;

/**
 * @return array{publicBaseUrl: string}
 */
function getSiteConfig(): array
{
    $defaults = ['publicBaseUrl' => ''];
    if (!is_file(SITE_CONFIG_PATH)) {
        return $defaults;
    }
    $raw = @file_get_contents(SITE_CONFIG_PATH);
    if ($raw === false || $raw === '') {
        return $defaults;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return $defaults;
    }
    return array_merge($defaults, [
        'publicBaseUrl' => isset($data['publicBaseUrl']) ? trim((string) $data['publicBaseUrl']) : '',
    ]);
}

/**
 * @param array{publicBaseUrl?: string} $config
 */
function saveSiteConfig(array $config): bool
{
    $dir = dirname(SITE_CONFIG_PATH);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        return false;
    }
    $payload = [
        'publicBaseUrl' => isset($config['publicBaseUrl']) ? trim((string) $config['publicBaseUrl']) : '',
    ];
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    return @file_put_contents(SITE_CONFIG_PATH, $json . "\n") !== false;
}

function isHttpsRequest(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }
    if (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443) {
        return true;
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower((string) $_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') {
        return true;
    }
    return false;
}

function getRequestScheme(): string
{
    return isHttpsRequest() ? 'https' : 'http';
}

/**
 * Detect a usable LAN IPv4 address (prefer 192.168.x / 10.x).
 */
function detectLanIp(): ?string
{
    $candidates = [];

    $hostname = gethostname();
    if (is_string($hostname) && $hostname !== '') {
        $resolved = gethostbyname($hostname);
        if (is_string($resolved) && filter_var($resolved, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $candidates[] = $resolved;
        }
    }

    if (!empty($_SERVER['SERVER_ADDR'])) {
        $sa = (string) $_SERVER['SERVER_ADDR'];
        if (filter_var($sa, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $candidates[] = $sa;
        }
    }

    if (stripos(PHP_OS_FAMILY, 'Windows') !== false) {
        $out = [];
        @exec('ipconfig', $out);
        $text = implode("\n", $out);
        if (preg_match_all('/IPv4 Address[.\s]*:\s*([0-9.]+)/i', $text, $m)) {
            foreach ($m[1] as $ip) {
                $candidates[] = $ip;
            }
        }
    } else {
        $out = [];
        @exec('hostname -I 2>/dev/null', $out);
        if (!empty($out[0])) {
            foreach (preg_split('/\s+/', trim($out[0])) as $ip) {
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                    $candidates[] = $ip;
                }
            }
        }
    }

    $preferred = [];
    $other = [];
    foreach (array_unique($candidates) as $ip) {
        if ($ip === '127.0.0.1' || str_starts_with($ip, '127.')) {
            continue;
        }
        if (str_starts_with($ip, '192.168.') || str_starts_with($ip, '10.')) {
            $preferred[] = $ip;
        } elseif (preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $ip)) {
            $preferred[] = $ip;
        } else {
            $other[] = $ip;
        }
    }

    if (!empty($preferred)) {
        return $preferred[0];
    }
    if (!empty($other)) {
        return $other[0];
    }
    return null;
}

function getAppBasePath(): string
{
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    $dir = rtrim(str_replace('\\', '/', dirname($script)), '/');
    // API scripts live in /api — go up one level for public app root
    if (str_ends_with($dir, '/api')) {
        $dir = substr($dir, 0, -4);
    }
    if ($dir === '' || $dir === '.') {
        return '';
    }
    return $dir;
}

/**
 * True for localhost / private LAN hosts (not a public cPanel domain).
 */
function isPrivateOrLocalHost(string $host): bool
{
    $host = strtolower(trim($host));
    if ($host === '' || $host === 'localhost' || $host === '127.0.0.1' || $host === '::1') {
        return true;
    }
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        return !filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }
    return false;
}

/**
 * Public URL for phone QR access.
 * Uses site.json override only when it still matches the current environment
 * (ignores a leftover LAN IP after uploading to cPanel).
 */
function getPublicBaseUrl(): string
{
    $scheme = getRequestScheme();
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $hostOnly = explode(':', $host)[0];
    $base = getAppBasePath();

    $config = getSiteConfig();
    $override = rtrim($config['publicBaseUrl'], '/');
    if ($override !== '') {
        $overrideHost = (string) (parse_url($override, PHP_URL_HOST) ?: '');
        // Stale LAN/localhost override on a live domain → ignore and use current host
        $stalePrivate = $overrideHost !== ''
            && isPrivateOrLocalHost($overrideHost)
            && !isPrivateOrLocalHost($hostOnly);
        if (!$stalePrivate) {
            return $override;
        }
    }

    if ($hostOnly === 'localhost' || $hostOnly === '127.0.0.1') {
        $lan = detectLanIp();
        if ($lan !== null) {
            $port = '';
            if (str_contains($host, ':')) {
                $parts = explode(':', $host, 2);
                $port = ':' . $parts[1];
            } elseif (!empty($_SERVER['SERVER_PORT']) && !in_array((int) $_SERVER['SERVER_PORT'], [80, 443], true)) {
                $port = ':' . (int) $_SERVER['SERVER_PORT'];
            }
            $host = $lan . $port;
        }
    }

    return rtrim($scheme . '://' . $host . $base, '/');
}

function targetImagePath(): string
{
    return TARGET_DIR . '/' . TARGET_IMAGE;
}

function targetMindPath(): string
{
    return TARGET_DIR . '/' . TARGET_MIND;
}

function targetImageExists(): bool
{
    return is_file(targetImagePath());
}

function targetMindExists(): bool
{
    return is_file(targetMindPath());
}

function fileVersionQuery(string $absolutePath): string
{
    if (!is_file($absolutePath)) {
        return '0';
    }
    return (string) filemtime($absolutePath);
}

function targetImageUrl(): string
{
    $v = fileVersionQuery(targetImagePath());
    return 'assets/targets/' . TARGET_IMAGE . '?v=' . rawurlencode($v);
}

function targetMindUrl(): string
{
    $v = fileVersionQuery(targetMindPath());
    return 'assets/targets/' . TARGET_MIND . '?v=' . rawurlencode($v);
}

/**
 * @return array{ok: bool, error?: string, path?: string}
 */
function processTargetUpload(array $file): array
{
    if (!isset($file['error']) || (int) $file['error'] !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'Upload failed. Please try again.'];
    }
    if (!isset($file['size']) || (int) $file['size'] <= 0) {
        return ['ok' => false, 'error' => 'Empty file uploaded.'];
    }
    if ((int) $file['size'] > TARGET_MAX_BYTES) {
        return ['ok' => false, 'error' => 'Image exceeds the 12 MB limit.'];
    }
    if (!isset($file['tmp_name']) || !is_uploaded_file((string) $file['tmp_name'])) {
        return ['ok' => false, 'error' => 'Invalid upload.'];
    }

    $tmp = (string) $file['tmp_name'];
    $info = @getimagesize($tmp);
    if ($info === false || !isset($info[0], $info[1], $info[2])) {
        return ['ok' => false, 'error' => 'File is not a valid image.'];
    }

    $type = (int) $info[2];
    $allowed = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP];
    if (!in_array($type, $allowed, true)) {
        return ['ok' => false, 'error' => 'Only JPG, PNG, and WEBP images are allowed.'];
    }

    $src = match ($type) {
        IMAGETYPE_JPEG => @imagecreatefromjpeg($tmp),
        IMAGETYPE_PNG => @imagecreatefrompng($tmp),
        IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($tmp) : false,
        default => false,
    };

    if ($src === false) {
        return ['ok' => false, 'error' => 'Unable to read the uploaded image.'];
    }

    $width = imagesx($src);
    $height = imagesy($src);
    if ($width < 64 || $height < 64) {
        imagedestroy($src);
        return ['ok' => false, 'error' => 'Image is too small for AR tracking (min 64px).'];
    }

    $maxDim = max($width, $height);
    if ($maxDim > TARGET_MAX_DIMENSION) {
        $scale = TARGET_MAX_DIMENSION / $maxDim;
        $nw = max(1, (int) round($width * $scale));
        $nh = max(1, (int) round($height * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        if ($dst === false) {
            imagedestroy($src);
            return ['ok' => false, 'error' => 'Failed to resize image.'];
        }
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $width, $height);
        imagedestroy($src);
        $src = $dst;
    }

    if (!is_dir(TARGET_DIR) && !@mkdir(TARGET_DIR, 0755, true)) {
        imagedestroy($src);
        return ['ok' => false, 'error' => 'Target directory is not writable.'];
    }

    $outPath = targetImagePath();
    if (!@imagejpeg($src, $outPath, 90)) {
        imagedestroy($src);
        return ['ok' => false, 'error' => 'Failed to save target image.'];
    }
    imagedestroy($src);

    // Invalidate old compiled target
    $mind = targetMindPath();
    if (is_file($mind)) {
        @unlink($mind);
    }

    return ['ok' => true, 'path' => 'assets/targets/' . TARGET_IMAGE];
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}
