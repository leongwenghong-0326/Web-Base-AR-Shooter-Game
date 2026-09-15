<?php
declare(strict_types=1);
require_once __DIR__ . '/includes.php';

$targetUrl = targetImageExists() ? targetImageUrl() : '';
$mindReady = targetMindExists();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<?php renderHead('Compile Target — AR GAME Shooter'); ?>
<script async src="https://cdn.jsdelivr.net/npm/es-module-shims@1.10.0/dist/es-module-shims.js"></script>
<script type="importmap">
{
  "imports": {
    "mindar-image": "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js"
  }
}
</script>
</head>
<body>
<?php renderNav('compile'); ?>
<main class="page">
  <section class="hero">
    <p class="hero-kicker">MindAR</p>
    <h1 class="hero-title">Compile<span>TARGET</span></h1>
    <p class="hero-lead">Upload a tracking image, then compile it in the browser to generate targets.mind.</p>
  </section>

  <div class="grid-2">
    <section class="panel">
      <h2>1. Upload Target Image</h2>
      <p class="muted">JPG, PNG, or WEBP. Max 12 MB. Saved as picture.jpg. Old compiled target is removed.</p>
      <form id="uploadTargetForm">
        <div class="form-row">
          <label for="targetFile">Image file</label>
          <input type="file" id="targetFile" name="target" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" required>
        </div>
        <button class="btn" type="submit">Upload Image</button>
        <div id="uploadTargetStatus" class="status hidden"></div>
      </form>
      <div style="margin-top:1rem">
        <?php if ($targetUrl !== ''): ?>
          <img id="compilePreview" class="target-preview" src="<?php echo e($targetUrl); ?>" alt="Current target">
        <?php else: ?>
          <img id="compilePreview" class="target-preview hidden" alt="Current target">
          <div id="noPreview" class="status warn">No target image yet.</div>
        <?php endif; ?>
      </div>
    </section>

    <section class="panel">
      <h2>2. Compile</h2>
      <p class="muted">Uses MindAR browser compiler, then saves via save-target.php.</p>
      <?php if ($mindReady): ?>
        <div class="status ok" id="mindBadge">targets.mind is present.</div>
      <?php else: ?>
        <div class="status warn" id="mindBadge">targets.mind not found — compile required.</div>
      <?php endif; ?>
      <div class="progress" aria-hidden="true"><span id="progressBar"></span></div>
      <p class="muted" id="progressText">0%</p>
      <div id="compileStatus" class="status hidden"></div>
      <div class="btn-row" style="margin-top:0.8rem">
        <button class="btn btn-primary" type="button" id="btnCompile" <?php echo $targetUrl === '' ? 'disabled' : ''; ?>>Start Compile</button>
        <button class="btn" type="button" id="btnRetry" disabled>Retry</button>
        <a class="btn btn-ghost" href="index.php">Home</a>
        <a class="btn" href="game.php">Play</a>
      </div>
    </section>
  </div>
</main>
<script type="module" src="assets/js/compile-target.js"></script>
</body>
</html>