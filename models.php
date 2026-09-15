<?php
declare(strict_types=1);
require_once __DIR__ . '/includes.php';

$payload = buildModelsApiPayload();
$config = $payload['config'];
$files = $payload['files'];
$enemyCandidates = $payload['enemyCandidates'];
$weaponCandidates = $payload['weaponCandidates'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<?php renderHead('Models — AR GAME Shooter'); ?>
</head>
<body>
<?php renderNav('models'); ?>
<main class="page">
  <section class="hero">
    <p class="hero-kicker">Loadout</p>
    <h1 class="hero-title">3D<span>MODELS</span></h1>
    <p class="hero-lead">Choose enemy and weapon GLB files, or leave Random for variety each match.</p>
  </section>

  <div class="grid-2">
    <section class="panel">
      <h2>Selection</h2>
      <form id="modelForm">
        <div class="form-row">
          <label for="enemySelect">Enemy</label>
          <select id="enemySelect" name="enemy">
            <option value="random" <?php echo strtolower($config['enemy']) === 'random' ? 'selected' : ''; ?>>Random</option>
            <?php foreach ($enemyCandidates as $f): ?>
              <option value="<?php echo e($f); ?>" <?php echo $config['enemy'] === $f ? 'selected' : ''; ?>><?php echo e($f); ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="form-row">
          <label for="weaponSelect">Weapon</label>
          <select id="weaponSelect" name="weapon">
            <option value="random" <?php echo strtolower($config['weapon']) === 'random' ? 'selected' : ''; ?>>Random</option>
            <?php foreach ($weaponCandidates as $f): ?>
              <option value="<?php echo e($f); ?>" <?php echo $config['weapon'] === $f ? 'selected' : ''; ?>><?php echo e($f); ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" type="submit">Save Selection</button>
          <a class="btn" href="game.php">Play</a>
        </div>
        <div id="saveStatus" class="status hidden"></div>
      </form>
    </section>

    <section class="panel">
      <h2>Upload GLB</h2>
      <p class="muted">Max 40 MB. File must be a real GLB (glTF magic header).</p>
      <form id="uploadForm">
        <div class="form-row">
          <label for="modelFile">GLB file</label>
          <input type="file" id="modelFile" name="model" accept=".glb,model/gltf-binary" required>
        </div>
        <button class="btn" type="submit">Upload Model</button>
        <div id="uploadStatus" class="status hidden"></div>
      </form>
      <h3 style="margin-top:1.2rem">Available files</h3>
      <ul class="list-steps" id="fileList">
        <?php if (empty($files)): ?>
          <li>No GLB files yet.</li>
        <?php else: ?>
          <?php foreach ($files as $f): ?>
            <li><?php echo e($f); ?></li>
          <?php endforeach; ?>
        <?php endif; ?>
      </ul>
    </section>
  </div>
</main>
<script src="assets/js/models-page.js"></script>
</body>
</html>