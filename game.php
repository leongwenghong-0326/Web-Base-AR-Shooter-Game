<?php
declare(strict_types=1);
require_once __DIR__ . '/includes.php';

$mindReady = targetMindExists();
$targetReady = targetImageExists();
$mindUrl = $mindReady ? targetMindUrl() : '';

$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/ar_shooter_game'));
$assetBase = rtrim($scriptDir, '/');
$v = '1789446000';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<?php renderHead('Play - AR GAME Shooter'); ?>
<script type="importmap">
{
  "imports": {
    "three": "<?php echo htmlspecialchars($assetBase, ENT_QUOTES); ?>/assets/vendor/three/three.module.js",
    "three/addons/": "<?php echo htmlspecialchars($assetBase, ENT_QUOTES); ?>/assets/vendor/three/examples/jsm/",
    "mindar-image-three": "<?php echo htmlspecialchars($assetBase, ENT_QUOTES); ?>/assets/vendor/mindar/mindar-image-three.prod.js"
  }
}
</script>
</head>
<body class="game-page">
  <div id="ar-root"></div>

  <div id="startGate" class="start-gate">
    <div class="start-card">
      <h1>AR Shooter</h1>
      <p>Press Start AR to request the rear camera. Point at the printed/displayed target to begin.</p>
      <?php if (!$targetReady): ?>
        <div class="status err">Target image missing. Upload one first.</div>
      <?php elseif (!$mindReady): ?>
        <div class="status warn">Compiled targets.mind missing. Compile the target before playing.</div>
        <div class="btn-row" style="justify-content:center">
          <a class="btn" href="compile-target.php">Compile Target</a>
          <a class="btn btn-ghost" href="index.php">Home</a>
        </div>
      <?php else: ?>
        <div class="btn-row" style="justify-content:center">
          <button class="btn btn-primary interactive" type="button" id="btnStartAr">Start AR</button>
          <a class="btn btn-ghost" href="index.php">Home</a>
        </div>
      <?php endif; ?>
      <div id="startError" class="status err hidden"></div>
    </div>
  </div>

  <div id="gameOverlay" class="game-overlay hidden">
    <div class="hud" id="hud">
      <div class="hud-item"><span class="label">Score</span><span class="value" id="hudScore">0</span></div>
      <div class="hud-item"><span class="label">Wave</span><span class="value" id="hudWave">1</span></div>
      <div class="hud-item"><span class="label">HP</span><span class="value" id="hudHp">5</span></div>
      <div class="hud-item"><span class="label">Ammo</span><span class="value" id="hudAmmo">30/30</span></div>
    </div>
    <div class="crosshair" id="crosshair"></div>
    <div class="banner" id="banner"></div>
    <button class="ctrl-btn interactive" type="button" id="btn-reload">Reload</button>
    <button class="ctrl-btn interactive" type="button" id="btn-fire">Fire</button>
  </div>

  <div id="gameOver" class="game-over hidden">
    <div class="over-card">
      <h1>Game Over</h1>
      <p>Score: <strong id="overScore">0</strong><br>Wave reached: <strong id="overWave">1</strong></p>
      <div class="btn-row" style="justify-content:center">
        <button class="btn btn-primary interactive" type="button" id="btnRestart">Restart</button>
        <a class="btn btn-ghost" href="index.php">Home</a>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    window.AR_GAME_CONFIG = {
      mindUrl: <?php echo json_encode($mindUrl, JSON_UNESCAPED_SLASHES); ?>,
      mindReady: <?php echo $mindReady ? 'true' : 'false'; ?>,
      modelsApi: 'api/models.php',
      assetBase: <?php echo json_encode($assetBase, JSON_UNESCAPED_SLASHES); ?>
    };
    window.__AR_GAME_READY = false;
    window.onerror = function (msg) {
      var err = document.getElementById('startError');
      if (!err) return;
      err.classList.remove('hidden');
      err.textContent = 'Script error: ' + msg;
    };
  </script>
  <script type="module" src="<?php echo htmlspecialchars($assetBase, ENT_QUOTES); ?>/assets/js/main.js?v=<?php echo $v; ?>"></script>
</body>
</html>
