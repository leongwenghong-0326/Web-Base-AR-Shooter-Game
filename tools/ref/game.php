<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <title>ARGAME — Play</title>
  <link rel="stylesheet" href="assets/css/game.css">
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
      "mindar-image-three": "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js"
    }
  }
  </script>
</head>
<body class="page-game" data-mind-src="assets/targets/targets.mind?v=1789288789">
<script>document.documentElement.classList.add('page-game');</script>
  <div id="ar-container"></div>

  <div id="hud" class="hud hidden">
    <div class="hud-top">
      <div class="hud-stat"><span>Score</span><strong id="hud-score">0</strong></div>
      <div class="hud-stat"><span>Wave</span><strong id="hud-wave">1</strong></div>
      <div class="hud-stat"><span>HP</span><strong id="hud-hp">5</strong></div>
      <div class="hud-stat"><span>Ammo</span><strong id="hud-ammo">30</strong></div>
    </div>
    <div class="crosshair" aria-hidden="true"></div>
    <button type="button" id="btn-fire" class="btn-fire" aria-label="Fire">FIRE</button>
    <button type="button" id="btn-reload" class="btn-reload" aria-label="Reload">RELOAD</button>
  </div>

  <div id="overlay" class="overlay">
    <div class="overlay-card">
      <h1 id="overlay-title">AR Game Shooter</h1>
      <p id="overlay-message">Allow the camera, then aim the rear lens at the target image. Enemies appear when locked. Crosshair turns red while firing.</p>
              <button type="button" id="btn-start" class="btn btn-primary">Start AR</button>
            <a class="btn btn-ghost" href="index.php">Back</a>
    </div>
  </div>

  <div id="toast" class="toast hidden" role="status"></div>

  <script type="module" src="assets/js/main.js"></script>
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495" integrity="sha512-iIg7k2xntmwu6/uSb5tpc/hySgZc4eoL31yB29W6tJFo2akwjPWcEqnCEdJvGexCL0KEQwVYv5BlowfhVz26hg==" data-cf-beacon='{"version":"2024.11.0","token":"8b2523dc771340f3af2d38766e62a38b","r":1,"spa":2}' crossorigin="anonymous"></script>
</body>
</html>
