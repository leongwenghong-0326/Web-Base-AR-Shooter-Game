<?php
declare(strict_types=1);
require_once __DIR__ . '/includes.php';

$publicUrl = getPublicBaseUrl();
$targetUrl = targetImageExists() ? targetImageUrl() : '';
$mindReady = targetMindExists();
$siteConfig = getSiteConfig();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<?php renderHead('AR GAME Shooter'); ?>
</head>
<body>
<?php renderNav('home'); ?>
<main class="page">
  <section class="hero">
    <p class="hero-kicker">Mobile WebAR FPS</p>
    <h1 class="hero-title">AR GAME<span>SHOOTER</span></h1>
    <p class="hero-lead">Scan the target image with your phone and fight waves of enemies using augmented reality.</p>
    <div class="btn-row">
      <a class="btn btn-primary" href="game.php">Start Game</a>
      <a class="btn" href="models.php">Change Models</a>
      <button class="btn btn-ghost" type="button" id="btnFullscreenTarget">Fullscreen Target</button>
    </div>
    <?php if (!$mindReady): ?>
      <div class="status warn">Compiled target missing. Upload/compile on the Compile page before playing.</div>
    <?php else: ?>
      <div class="status ok">Target compiled and ready.</div>
    <?php endif; ?>
  </section>

  <div class="grid-2">
    <section class="panel">
      <h2>How to Play</h2>
      <ol class="list-steps">
        <li>Connect the phone and PC to the same Wi-Fi.</li>
        <li>Scan the QR code with your phone.</li>
        <li>Open the website on the phone.</li>
        <li>Put the target image on another screen or print it.</li>
        <li>Press Start Game, then Start AR.</li>
        <li>Allow camera permission (rear camera).</li>
        <li>Aim at the target and wait for TARGET LOCKED.</li>
        <li>Shoot enemies with FIRE. Press RELOAD when empty.</li>
        <li>Survive waves until HP reaches zero.</li>
        <li>Recommended: Chrome on Android for first tests.</li>
      </ol>
    </section>

    <section class="panel">
      <h2>Phone Access QR</h2>
      <div class="qr-wrap">
        <canvas id="qrCanvas" width="220" height="220" aria-label="QR code"></canvas>
        <div class="url-box" id="publicUrl"><?php echo e($publicUrl); ?></div>
        <div class="btn-row">
          <button class="btn" type="button" id="btnDownloadQr">Download QR</button>
          <a class="btn btn-ghost" href="compile-target.php">Compile Target</a>
        </div>
      </div>
      <form id="siteForm" class="form-row" style="margin-top:1rem">
        <label for="publicBaseUrl">Optional public URL override</label>
        <input type="url" id="publicBaseUrl" name="publicBaseUrl" placeholder="https://your-domain.com/ar_shooter_game" value="<?php echo e($siteConfig['publicBaseUrl']); ?>">
        <button class="btn" type="submit">Save URL</button>
        <div id="siteStatus" class="status hidden"></div>
      </form>
    </section>
  </div>

  <section class="panel" style="margin-top:1rem">
    <h2>AR Target Preview</h2>
    <p class="muted">Tap the image for fullscreen. Print it or display it on a second screen.</p>
    <?php if ($targetUrl !== ''): ?>
      <img id="targetPreview" class="target-preview" src="<?php echo e($targetUrl); ?>" alt="AR target image">
    <?php else: ?>
      <div class="status err">No target image found. Upload one on the Compile page.</div>
    <?php endif; ?>
    <div class="btn-row" style="margin-top:0.8rem">
      <a class="btn" href="upload-target.php" onclick="return false;" id="openUploadHint">Upload via Compile page</a>
      <a class="btn btn-primary" href="compile-target.php">Go to Compile</a>
    </div>
  </section>
</main>
<script src="assets/js/home.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js" onload="window.renderArGameQr && window.renderArGameQr()" onerror="window.renderArGameQr && window.renderArGameQr()"></script>
<script src="https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js" onload="window.renderArGameQr && window.renderArGameQr()"></script>
</body>
</html>