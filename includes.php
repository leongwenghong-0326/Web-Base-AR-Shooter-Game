<?php
declare(strict_types=1);

require_once __DIR__ . '/api/site_lib.php';
require_once __DIR__ . '/api/models_lib.php';

/**
 * Shared HTML head helpers.
 */
function renderHead(string $title, bool $includeGameCss = true): void
{
    $safeTitle = e($title);
    echo <<<HTML
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#0b0f14">
<title>{$safeTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
HTML;
    if ($includeGameCss) {
        echo '<link rel="stylesheet" href="assets/css/game.css">' . "\n";
    }
}

function renderNav(string $active = 'home'): void
{
    $items = [
        'home' => ['index.php', 'Home'],
        'play' => ['game.php', 'Play'],
        'models' => ['models.php', 'Models'],
        'compile' => ['compile-target.php', 'Compile'],
    ];
    echo '<header class="site-header"><div class="nav-inner">';
    echo '<a class="brand" href="index.php"><span class="brand-mark">AR</span><span class="brand-text">ARGAME</span></a>';
    echo '<nav class="site-nav" aria-label="Main">';
    foreach ($items as $key => [$href, $label]) {
        $cls = $key === $active ? 'nav-link is-active' : 'nav-link';
        echo '<a class="' . e($cls) . '" href="' . e($href) . '">' . e($label) . '</a>';
    }
    echo '</nav></div></header>';
}
